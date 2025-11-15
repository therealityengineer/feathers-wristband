import type { Application, HookContext, Params } from '@feathersjs/feathers'
import type { Context as KoaContext, DefaultState } from 'koa'
import { createWristbandAuth } from '@wristband/express-auth'
import { getSession, type SessionOptions } from '@wristband/typescript-session'
import type {
  WristbandAuthConfig,
  WristbandSessionConfig,
  WristbandSession
} from '../types'

export type KoaFeathersApp = Application & {
  use: (
    middleware: (ctx: KoaContext<DefaultState>, next: () => Promise<void>) => Promise<void> | void
  ) => void
}

type WristbandAuthInstance = ReturnType<typeof createWristbandAuth>

export function wristbandKoaBridge(
  app: KoaFeathersApp,
  authConfig: WristbandAuthConfig,
  sessionConfig: WristbandSessionConfig
): WristbandAuthInstance {
  const wristbandAuth = createWristbandAuth(authConfig)

  app.use(async (ctx: KoaContext<DefaultState>, next) => {
    const options: SessionOptions = {
      secrets: sessionConfig.secrets,
      maxAge: sessionConfig.maxAge ?? 86400,
      cookieName: sessionConfig.cookieName ?? 'wb_session',
      secure: sessionConfig.secure ?? true
    }

    const session = (await getSession(ctx.req, ctx.res, options)) as WristbandSession

    ctx.feathers = {
      ...(ctx.feathers || {}),
      koa: { ctx },
      session,
      wristbandAuth
    }

    await next()
  })

  return wristbandAuth
}

type ParamsOrContext = Params | HookContext

type ParamsWithFeathers = Params & {
  koa?: { ctx: KoaContext }
  session?: WristbandSession
  wristbandAuth?: WristbandAuthInstance
}

type HookContextWithFeathers = HookContext & {
  params: ParamsWithFeathers
}

function isHookContext(value: ParamsOrContext): value is HookContextWithFeathers {
  return (value as HookContext).params !== undefined
}

function getParams(pc: ParamsOrContext): ParamsWithFeathers {
  if (isHookContext(pc)) {
    return pc.params as ParamsWithFeathers
  }

  return pc as ParamsWithFeathers
}

export function getKoaContext(pc: ParamsOrContext): KoaContext {
  const params = getParams(pc)
  const koa = params.koa
  if (!koa) {
    throw Object.assign(new Error('Koa context not found on params. Did you configure wristbandKoaBridge?'), {
      code: 500
    })
  }
  return koa.ctx
}

export function getSessionFromParams(pc: ParamsOrContext): WristbandSession {
  const params = getParams(pc)
  const session = params.session
  if (!session) {
    throw Object.assign(new Error('Wristband session not found on params'), {
      code: 500
    })
  }
  return session
}

export function getWristbandAuthFromParams(pc: ParamsOrContext): WristbandAuthInstance {
  const params = getParams(pc)
  const auth = params.wristbandAuth
  if (!auth) {
    throw Object.assign(new Error('Wristband auth instance not found on params'), {
      code: 500
    })
  }
  return auth
}
