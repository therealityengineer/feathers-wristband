import type { Application, Params } from '@feathersjs/feathers'
import {
  getKoaContext,
  getExpressContext,
  getSessionFromParams,
  getWristbandAuthFromParams
} from '../adapter/wristband-koa'
import type {
  LoginData,
  LogoutData,
  CallbackData,
  SessionData,
  TokenData
} from '../types'
import { redirectAfterHook, noStoreAfterHook } from '../hooks/http-redirects'

export class WristbandService {
  async login(data: LoginData, params: Params) {
    const loginData = data || {}
    getKoaContext(params)
    const auth = getWristbandAuthFromParams(params)
    const express = getExpressContext(params)

    if (loginData.tenantName) {
      express.req.query.tenant_domain = loginData.tenantName
    }

    if (loginData.returnUrl) {
      express.req.query.return_url = loginData.returnUrl
    }

    if (loginData.tenantCustomDomain) {
      express.req.headers.host = loginData.tenantCustomDomain
    }

    await auth.login(express.req as any, express.res as any, {
      defaultTenantDomain: loginData.tenantName
    })

    const redirectUrl = express.res.getRedirectUrl()
    if (!redirectUrl) {
      throw Object.assign(new Error('Login redirect missing'), { code: 500 })
    }

    return { redirectUrl }
  }

  async callback(_data: CallbackData, params: Params) {
    getKoaContext(params)
    const auth = getWristbandAuthFromParams(params)
    const session = getSessionFromParams(params)
    const express = getExpressContext(params)

    const result = await auth.callback(express.req as any, express.res as any)

    if (!result) {
      const redirectUrl = express.res.getRedirectUrl()
      if (!redirectUrl) {
        throw Object.assign(new Error('Callback redirect missing'), { code: 500 })
      }
      return { redirectUrl }
    }

    session.fromCallback(result)
    await session.save()

    const returnUrl = result.returnUrl ?? '/'
    return { redirectUrl: returnUrl }
  }

  async logout(_data: LogoutData, params: Params) {
    getKoaContext(params)
    const auth = getWristbandAuthFromParams(params)
    const session = getSessionFromParams(params)
    const express = getExpressContext(params)

    const { refreshToken, tenantCustomDomain, tenantName } = session

    session.destroy()

    await auth.logout(express.req as any, express.res as any, {
      refreshToken,
      tenantDomainName: tenantCustomDomain ?? tenantName
    })

    const redirectUrl = express.res.getRedirectUrl()
    if (!redirectUrl) {
      throw Object.assign(new Error('Logout redirect missing'), { code: 500 })
    }

    return { redirectUrl }
  }

  async session(_data: SessionData, params: Params) {
    const session = getSessionFromParams(params)
    return session.getSessionResponse()
  }

  async token(_data: TokenData, params: Params) {
    const session = getSessionFromParams(params)
    return session.getTokenResponse()
  }
}

export function registerWristbandService(app: Application) {
  const service = new WristbandService()

  app.use(
    'auth/wristband',
    service as any,
    {
      methods: ['login', 'callback', 'logout', 'session', 'token'],
      events: []
    } as any
  )

  const wristbandService = app.service('auth/wristband') as any

  wristbandService.hooks({
    before: {},
    after: {
      login: [redirectAfterHook],
      callback: [redirectAfterHook],
      logout: [redirectAfterHook],
      session: [noStoreAfterHook]
    }
  })
}
