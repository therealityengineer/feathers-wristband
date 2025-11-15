import type { Application, Params } from '@feathersjs/feathers'
import { CallbackResultType } from '@wristband/express-auth'
import {
  getKoaContext,
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
    const ctx = getKoaContext(params)
    const auth = getWristbandAuthFromParams(params)

    const redirectUrl: string = await auth.login(ctx.req, ctx.res, {
      tenantName: data.tenantName,
      tenantCustomDomain: data.tenantCustomDomain,
      returnUrl: data.returnUrl
    })

    return { redirectUrl }
  }

  async callback(_data: CallbackData, params: Params) {
    const ctx = getKoaContext(params)
    const auth = getWristbandAuthFromParams(params)
    const session = getSessionFromParams(params)

    const result = await auth.callback(ctx.req, ctx.res)

    if (result.type === CallbackResultType.REDIRECT_REQUIRED) {
      return { redirectUrl: result.redirectUrl }
    }

    session.fromCallback(result.callbackData)
    await session.save()

    const returnUrl = result.callbackData?.returnUrl ?? '/'
    return { redirectUrl: returnUrl }
  }

  async logout(_data: LogoutData, params: Params) {
    const ctx = getKoaContext(params)
    const auth = getWristbandAuthFromParams(params)
    const session = getSessionFromParams(params)

    const { refreshToken, tenantCustomDomain, tenantName } = session

    session.destroy()

    const redirectUrl: string = await auth.logout(ctx.req, ctx.res, {
      refreshToken,
      tenantCustomDomain,
      tenantName
    })

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

  app.use('auth/wristband', service, {
    methods: ['login', 'callback', 'logout', 'session', 'token'],
    events: []
  })

  const wristbandService = app.service('auth/wristband')

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
