import type { HookContext } from '@feathersjs/feathers'
import type { WristbandGuardOptions, WristbandSession } from '../types'

type AuthenticationService = {
  authenticate: (data: { strategy: string; accessToken: string }) => Promise<any>
}

const BEARER_PREFIX = 'Bearer '

function createHttpError(message: string, code: number) {
  const error = new Error(message) as Error & { code?: number }
  error.code = code
  return error
}

export const wristbandGuard =
  (options: WristbandGuardOptions = {}) =>
  async (context: HookContext) => {
    const { app, params } = context
    const headers = params.headers || {}
    const authHeader = (headers.authorization || headers.Authorization) as string | undefined

    let jwtSucceeded = false

    if (authHeader?.startsWith(BEARER_PREFIX)) {
      const accessToken = authHeader.slice(BEARER_PREFIX.length)
      const authService = app.service('authentication') as AuthenticationService | undefined

      if (!authService || typeof authService.authenticate !== 'function') {
        throw createHttpError('Authentication service not available', 500)
      }

      try {
        const result = await authService.authenticate({ strategy: 'wristband', accessToken })
        params.authentication = result.authentication
        if (result.user) {
          ;(params as any).user = result.user
        }
        params.authenticated = true
        jwtSucceeded = true
      } catch (error) {
        if (!options.allowSessionFallbackOnBadJWT) {
          throw createHttpError('Invalid access token', 401)
        }
      }
    }

    if (!jwtSucceeded) {
      const session = (params as any).session as WristbandSession | undefined
      if (session?.accessToken) {
        params.authenticated = true
        return context
      }

      throw createHttpError('Not authenticated', 401)
    }

    return context
  }
