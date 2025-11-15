import { expect } from 'chai'
import { wristbandGuard } from '../src/hooks/wristband-guard'
import type { HookContext } from '@feathersjs/feathers'

describe('wristbandGuard', () => {
  function createContext(overrides: Partial<HookContext> = {}): HookContext {
    return {
      type: 'before',
      app: {
        service() {
          throw new Error('service not mocked')
        }
      } as any,
      params: {
        headers: {}
      },
      method: 'find',
      path: 'invoices',
      ...overrides
    } as HookContext
  }

  it('authenticates using jwt', async () => {
    const authenticate = async () => ({
      authentication: { strategy: 'wristband' },
      user: { sub: 'user-123' }
    })

    const context = createContext({
      app: {
        service() {
          return { authenticate }
        }
      } as any,
      params: {
        headers: {
          authorization: 'Bearer GOOD_TOKEN'
        }
      }
    })

    const guard = wristbandGuard()
    await guard(context)

    expect(context.params.authenticated).to.equal(true)
    expect((context.params as any).user.sub).to.equal('user-123')
  })

  it('fails when jwt invalid and fallback disabled', async () => {
    const authenticate = async () => {
      throw new Error('invalid')
    }

    const context = createContext({
      app: {
        service() {
          return { authenticate }
        }
      } as any,
      params: {
        headers: {
          authorization: 'Bearer BAD_TOKEN'
        }
      }
    })

    const guard = wristbandGuard({ allowSessionFallbackOnBadJWT: false })

    let error: any
    try {
      await guard(context)
    } catch (err: any) {
      error = err
    }

    expect(error).to.exist
    expect(error.code).to.equal(401)
  })

  it('falls back to session when jwt invalid', async () => {
    const authenticate = async () => {
      throw new Error('invalid')
    }

    const context = createContext({
      app: {
        service() {
          return { authenticate }
        }
      } as any,
      params: {
        headers: {
          authorization: 'Bearer BAD_TOKEN'
        },
        session: {
          accessToken: 'SESSION_TOKEN'
        }
      } as any
    })

    const guard = wristbandGuard({ allowSessionFallbackOnBadJWT: true })
    await guard(context)

    expect(context.params.authenticated).to.equal(true)
  })

  it('authenticates using session only', async () => {
    const context = createContext({
      params: {
        headers: {},
        session: {
          accessToken: 'SESSION_TOKEN'
        }
      } as any
    })

    const guard = wristbandGuard()
    await guard(context)

    expect(context.params.authenticated).to.equal(true)
  })

  it('throws when no authentication provided', async () => {
    const context = createContext()
    const guard = wristbandGuard({ allowSessionFallbackOnBadJWT: true })

    let error: any
    try {
      await guard(context)
    } catch (err: any) {
      error = err
    }

    expect(error).to.exist
    expect(error.code).to.equal(401)
  })
})
