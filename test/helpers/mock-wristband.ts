import mock from 'mock-require'
import type { WristbandSession } from '../../src/types'

export const CallbackResultType = {
  REDIRECT_REQUIRED: 'REDIRECT_REQUIRED',
  CALLBACK_RESULT: 'CALLBACK_RESULT'
} as const

type CallbackResult =
  | { type: typeof CallbackResultType.REDIRECT_REQUIRED; redirectUrl: string }
  | { type: typeof CallbackResultType.CALLBACK_RESULT; callbackData: any }

class FakeSession implements WristbandSession {
  accessToken?: string
  refreshToken?: string
  tenantName?: string
  tenantCustomDomain?: string
  csrfToken?: string
  saved = false
  destroyed = false

  constructor() {
    this.reset()
  }

  reset() {
    this.accessToken = 'SESSION_ACCESS'
    this.refreshToken = 'SESSION_REFRESH'
    this.tenantName = 'tenant-1'
    this.tenantCustomDomain = 'tenant.example.com'
    this.csrfToken = 'csrf-token'
    this.saved = false
    this.destroyed = false
  }

  async save() {
    this.saved = true
  }

  destroy() {
    this.destroyed = true
    this.accessToken = undefined
    this.refreshToken = undefined
  }

  toJSON() {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tenantName: this.tenantName,
      tenantCustomDomain: this.tenantCustomDomain,
      csrfToken: this.csrfToken
    }
  }

  fromCallback(callbackData: any) {
    this.accessToken = callbackData.accessToken
    this.refreshToken = callbackData.refreshToken
    this.tenantCustomDomain = callbackData.tenantCustomDomain
    this.tenantName = callbackData.tenantName
    this.csrfToken = callbackData.csrfToken ?? 'csrf-token'
  }

  getSessionResponse() {
    return {
      userId: 'user-123',
      email: 'user@example.com',
      csrfToken: this.csrfToken
    }
  }

  getTokenResponse() {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken
    }
  }
}

const session = new FakeSession()

const authState = {
  callbackResult: {
    type: CallbackResultType.CALLBACK_RESULT,
    callbackData: {
      returnUrl: '/home',
      accessToken: 'ACCESS',
      refreshToken: 'REFRESH',
      tenantCustomDomain: 'tenant.example.com',
      tenantName: 'tenant-1'
    }
  } as CallbackResult,
  lastLoginOptions: undefined as any,
  lastLogoutOptions: undefined as any
}

mock('@wristband/typescript-session', {
  getSession: async () => session
})

mock('@wristband/express-auth', {
  CallbackResultType,
  createWristbandAuth: () => ({
    async login(_req: any, res: any, options: any) {
      authState.lastLoginOptions = options
      res.redirect('https://example.com/mock-login-redirect')
    },
    async callback(_req: any, res: any) {
      if (authState.callbackResult.type === CallbackResultType.REDIRECT_REQUIRED) {
        res.redirect(authState.callbackResult.redirectUrl)
        return
      }

      return authState.callbackResult.callbackData
    },
    async logout(_req: any, res: any, options: any) {
      authState.lastLogoutOptions = options
      res.redirect('https://example.com/mock-logout-redirect')
    }
  })
})

mock('@wristband/typescript-jwt', {
  createWristbandJwtValidator: (_config: any) => {
    return {
      extractBearerToken(header?: string | string[] | null) {
        if (!header) {
          throw new Error('Missing authorization header')
        }

        const value = Array.isArray(header) ? header[0] : header

        if (typeof value !== 'string' || !value.startsWith('Bearer ')) {
          throw new Error('Invalid authorization header')
        }

        return value.slice('Bearer '.length)
      },
      async validate(token: string) {
        if (token === 'GOOD_TOKEN') {
          return {
            isValid: true,
            payload: {
              sub: 'user-123',
              email: 'user@example.com',
              'wb:tenant': 'tenant-1',
              aud: 'test-audience'
            }
          }
        }

        if (token === 'BAD_TOKEN') {
          return {
            isValid: false,
            errorMessage: 'Invalid token'
          }
        }

        return {
          isValid: true,
          payload: {
            sub: 'user-generic',
            aud: 'test-audience'
          }
        }
      }
    }
  }
})

export function setMockCallbackResult(result: CallbackResult) {
  authState.callbackResult = result
}

export function resetMockState() {
  session.reset()
  authState.callbackResult = {
    type: CallbackResultType.CALLBACK_RESULT,
    callbackData: {
      returnUrl: '/home',
      accessToken: 'ACCESS',
      refreshToken: 'REFRESH',
      tenantCustomDomain: 'tenant.example.com',
      tenantName: 'tenant-1'
    }
  }
  authState.lastLoginOptions = undefined
  authState.lastLogoutOptions = undefined
}

export function getMockSession() {
  return session
}

export function getAuthState() {
  return authState
}

resetMockState()
