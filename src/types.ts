export type WristbandAuthConfig = {
  clientId: string
  clientSecret: string
  wristbandApplicationVanityDomain: string
  dangerouslyDisableSecureCookies?: boolean
}

export type WristbandSessionConfig = {
  secrets: string | string[]
  maxAge?: number
  secure?: boolean
  cookieName?: string
  csrfProtectionEnabled?: boolean
}

export type LoginData = {
  tenantName?: string
  tenantCustomDomain?: string
  returnUrl?: string
}

export type LogoutData = Record<string, never>
export type CallbackData = Record<string, never>
export type SessionData = Record<string, never>

export type TokenData = {
  forceRefresh?: boolean
}

export interface WristbandSession {
  accessToken?: string
  refreshToken?: string
  tenantName?: string
  tenantCustomDomain?: string
  csrfToken?: string
  save: () => Promise<void>
  destroy: () => void
  toJSON: () => any
  fromCallback: (callbackData: any, customFields?: Record<string, unknown>) => void
  getSessionResponse: (metadata?: Record<string, unknown>) => any
  getTokenResponse: () => any
}

export type WristbandGuardOptions = {
  allowSessionFallbackOnBadJWT?: boolean
}

export type WristbandJWTConfig = {
  issuer: string
  audience?: string | string[]
}
