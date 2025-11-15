import {
  AuthenticationBaseStrategy,
  type AuthenticationResult
} from '@feathersjs/authentication'
import type { Params } from '@feathersjs/feathers'
import { createWristbandJwtValidator, type WristbandJwtValidator } from '@wristband/typescript-jwt'
import type { WristbandJWTConfig } from '../types'

export class WristbandJWTStrategy extends AuthenticationBaseStrategy {
  private validator?: WristbandJwtValidator

  async getConfiguration(): Promise<WristbandJWTConfig & { name: string }> {
    const base = (this.authentication?.configuration?.wristband || {}) as WristbandJWTConfig
    return {
      name: 'wristband',
      ...base
    }
  }

  async parse(req: any) {
    const authHeader = req?.headers?.authorization as string | undefined
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return {
        strategy: 'wristband',
        accessToken: authHeader.slice('Bearer '.length)
      }
    }
    return null
  }

  async authenticate(data: any, _params?: Params): Promise<AuthenticationResult> {
    const accessToken = data?.accessToken
    if (!accessToken) {
      throw Object.assign(new Error('No access token provided'), { code: 400 })
    }

    const config = await this.getConfiguration()
    if (!config.issuer) {
      throw Object.assign(new Error('Wristband issuer is not configured'), { code: 500 })
    }

    if (!this.validator) {
      this.validator = createWristbandJwtValidator({
        wristbandApplicationVanityDomain: config.issuer
      })
    }

    const validator = this.validator
    if (!validator) {
      throw Object.assign(new Error('Failed to initialize Wristband validator'), { code: 500 })
    }

    const validationResult = await validator.validate(accessToken)
    if (!validationResult.isValid || !validationResult.payload) {
      throw Object.assign(new Error(validationResult.errorMessage ?? 'Invalid access token'), {
        code: 401
      })
    }

    const claims = validationResult.payload

    if (config.audience) {
      const expectedAudiences = Array.isArray(config.audience) ? config.audience : [config.audience]
      let tokenAudValues: string[] = []

      if (Array.isArray(claims.aud)) {
        tokenAudValues = claims.aud as string[]
      } else if (typeof claims.aud === 'string') {
        tokenAudValues = [claims.aud]
      }

      const audienceMatch =
        tokenAudValues.length > 0 && tokenAudValues.some((aud) => expectedAudiences.includes(aud))

      if (!audienceMatch) {
        throw Object.assign(new Error('Invalid audience'), { code: 401 })
      }
    }

    const user = {
      sub: claims.sub,
      email: claims.email,
      tenant: claims['wb:tenant'] ?? claims.tenant
    }

    return {
      accessToken,
      authentication: { strategy: 'wristband' },
      user
    }
  }
}
