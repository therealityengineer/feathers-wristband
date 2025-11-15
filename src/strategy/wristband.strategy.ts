import {
  AuthenticationBaseStrategy,
  type AuthenticationResult
} from '@feathersjs/authentication'
import type { Params } from '@feathersjs/feathers'
import { createWristbandJwtValidator } from '@wristband/typescript-jwt'
import type { WristbandJWTConfig } from '../types'

type JwtValidator = (token: string) => Promise<any>

export class WristbandJWTStrategy extends AuthenticationBaseStrategy {
  private validator?: JwtValidator

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
        wristbandApplicationVanityDomain: config.issuer,
        audience: config.audience
      })
    }

    const claims = await this.validator(accessToken)

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
