import { expect } from 'chai'
import request from 'supertest'
import { CallbackResultType, resetMockState, setMockCallbackResult, getMockSession } from './helpers/mock-wristband'
import { createTestApp } from './helpers/create-app'
import { WristbandService } from '../src/services/wristband.service'

describe('Wristband service', () => {
  let app: any
  let server: any

  beforeEach(async () => {
    resetMockState()
    app = await createTestApp()
    server = app.listen()
  })

  afterEach(async () => {
    if (server && typeof server.close === 'function') {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  it('redirects to login url', async () => {
    const response = await request(server)
      .post('/auth/wristband')
      .set('X-Service-Method', 'login')
      .expect(302)

    expect(response.headers.location).to.equal('https://example.com/mock-login-redirect')
  })

  it('handles callback redirect requirement', async () => {
    setMockCallbackResult({
      type: CallbackResultType.REDIRECT_REQUIRED,
      redirectUrl: 'https://example.com/mock-cb-redirect'
    })

    const response = await request(server)
      .post('/auth/wristband')
      .set('X-Service-Method', 'callback')
      .expect(302)

    expect(response.headers.location).to.equal('https://example.com/mock-cb-redirect')
  })

  it('persists session from callback data', async () => {
    setMockCallbackResult({
      type: CallbackResultType.CALLBACK_RESULT,
      callbackData: {
        returnUrl: '/dashboard',
        accessToken: 'CALLBACK_ACCESS',
        refreshToken: 'CALLBACK_REFRESH',
        tenantCustomDomain: 'tenant.example.com',
        tenantName: 'tenant-1'
      }
    })

    const response = await request(server)
      .post('/auth/wristband')
      .set('X-Service-Method', 'callback')
      .expect(302)

    expect(response.headers.location).to.equal('/dashboard')

    const session = getMockSession()
    expect(session.accessToken).to.equal('CALLBACK_ACCESS')
    expect(session.refreshToken).to.equal('CALLBACK_REFRESH')
    expect(session.saved).to.equal(true)
  })

  it('destroys session on logout and redirects', async () => {
    const response = await request(server)
      .post('/auth/wristband')
      .set('X-Service-Method', 'logout')
      .expect(302)

    expect(response.headers.location).to.equal('https://example.com/mock-logout-redirect')

    const session = getMockSession()
    expect(session.destroyed).to.equal(true)
    expect(session.accessToken).to.equal(undefined)
  })

  it('returns session response with no-store headers', async () => {
    const response = await request(server)
      .post('/auth/wristband')
      .set('X-Service-Method', 'session')
      .expect(200)

    expect(response.headers['cache-control']).to.equal('no-store')
    expect(response.headers.pragma).to.equal('no-cache')
    expect(response.body).to.deep.equal({
      userId: 'user-123',
      email: 'user@example.com',
      csrfToken: 'csrf-token'
    })
  })

  it('returns token response from session', async () => {
    const response = await request(server)
      .post('/auth/wristband')
      .set('X-Service-Method', 'token')
      .expect(200)

    expect(response.body).to.deep.equal({
      accessToken: 'SESSION_ACCESS',
      refreshToken: 'SESSION_REFRESH'
    })
  })

  it('throws helpful errors when context missing', async () => {
    const service = new WristbandService()

    let error: any
    try {
      await service.login({}, {} as any)
    } catch (err: any) {
      error = err
    }

    expect(error).to.exist
    expect(error.message).to.include('Koa context')

    error = undefined
    try {
      await service.session({}, { koa: { ctx: {} as any } } as any)
    } catch (err: any) {
      error = err
    }

    expect(error).to.exist
    expect(error.message).to.include('Wristband session')
  })
})
