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
    async login(_req: any, _res: any, options: any) {
      authState.lastLoginOptions = options
      return 'https://example.com/mock-login-redirect'
    },
    async callback(_req: any, _res: any) {
      return authState.callbackResult
    },
    async logout(_req: any, _res: any, options: any) {
      authState.lastLogoutOptions = options
      return 'https://example.com/mock-logout-redirect'
    }
  })
})

mock('@wristband/typescript-jwt', {
  createWristbandJwtValidator: (config: any) => {
    return async (token: string) => {
      if (token === 'GOOD_TOKEN') {
        return {
          sub: 'user-123',
          email: 'user@example.com',
          'wb:tenant': 'tenant-1',
          config
        }
      }

      if (token === 'BAD_TOKEN') {
        throw new Error('Invalid token')
      }

      return {
        sub: 'user-generic'
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
