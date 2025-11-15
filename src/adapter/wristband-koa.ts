import type { Application, HookContext, Params } from '@feathersjs/feathers'
import type { IncomingHttpHeaders } from 'http'
import type { Context as KoaContext } from 'koa'
import { createWristbandAuth } from '@wristband/express-auth'
import { getSession, type SessionOptions } from '@wristband/typescript-session'
import type {
  WristbandAuthConfig,
  WristbandSessionConfig,
  WristbandSession
} from '../types'

export type KoaFeathersApp = Application & {
  use: (
    middleware: (ctx: KoaContext, next: () => Promise<void>) => Promise<void> | void
  ) => void
}

type WristbandAuthInstance = ReturnType<typeof createWristbandAuth>
type ExpressLikeRequest = {
  query: Record<string, any>
  cookies: Record<string, string>
  headers: IncomingHttpHeaders
}

type ExpressLikeContext = {
  req: ExpressLikeRequest
  res: ExpressResponseAdapter
}

type CookieOptions = {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none' | boolean
  secure?: boolean
}

class ExpressResponseAdapter {
  private redirectUrl?: string

  constructor(private readonly ctx: KoaContext) {}

  header(name: string, value: string) {
    this.ctx.set(name, value)
    return this
  }

  redirect(url: string) {
    this.redirectUrl = url
    return url
  }

  cookie(name: string, value: string, options: CookieOptions = {}) {
    const sameSite =
      options.sameSite === true ? 'strict' : options.sameSite === false ? undefined : options.sameSite

    this.ctx.cookies.set(name, value, {
      httpOnly: options.httpOnly ?? true,
      maxAge: options.maxAge,
      overwrite: true,
      path: options.path ?? '/',
      sameSite,
      secure: options.secure
    })

    return this
  }

  clearCookie(name: string) {
    this.ctx.cookies.set(name, '', {
      expires: new Date(0),
      httpOnly: true,
      overwrite: true,
      path: '/'
    })

    return this
  }

  getRedirectUrl() {
    return this.redirectUrl
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=')
    if (index === -1) {
      return acc
    }

    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()

    if (key) {
      acc[key] = decodeURIComponent(value)
    }

    return acc
  }, {})
}

function createExpressRequest(ctx: KoaContext): ExpressLikeRequest {
  const base = Object.create(ctx.req) as ExpressLikeRequest
  base.headers = ctx.req.headers
  base.query = { ...ctx.request.query }
  base.cookies = parseCookies(ctx.headers.cookie)
  return base
}

function createExpressContext(ctx: KoaContext): ExpressLikeContext {
  return {
    req: createExpressRequest(ctx),
    res: new ExpressResponseAdapter(ctx)
  }
}

export function wristbandKoaBridge(
  app: KoaFeathersApp,
  authConfig: WristbandAuthConfig,
  sessionConfig: WristbandSessionConfig
): WristbandAuthInstance {
  const wristbandAuth = createWristbandAuth(authConfig)

  app.use(async (ctx: KoaContext, next) => {
    const options: SessionOptions = {
      secrets: sessionConfig.secrets,
      maxAge: sessionConfig.maxAge ?? 86400,
      cookieName: sessionConfig.cookieName ?? 'wb_session',
      secure: sessionConfig.secure ?? true
    }

    const session = (await getSession(ctx.req, ctx.res, options)) as WristbandSession
    const feathers = (ctx.feathers ?? {}) as ParamsWithFeathers

    const express = createExpressContext(ctx)

    feathers.koa = { ctx }
    feathers.session = session
    feathers.wristbandAuth = wristbandAuth
    feathers.express = express

    ctx.feathers = feathers

    await next()
  })

  return wristbandAuth
}

type ParamsOrContext = Params | HookContext

type ParamsWithFeathers = Params & {
  koa?: { ctx: KoaContext }
  session?: WristbandSession
  wristbandAuth?: WristbandAuthInstance
  express?: ExpressLikeContext
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

export function getExpressContext(pc: ParamsOrContext): ExpressLikeContext {
  const params = getParams(pc)
  const express = params.express
  if (!express) {
    throw Object.assign(new Error('Express adapters not found on params'), {
      code: 500
    })
  }
  return express
}
