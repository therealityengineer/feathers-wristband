import { feathers } from '@feathersjs/feathers'
import { koa, rest, errorHandler, bodyParser } from '@feathersjs/koa'
import { AuthenticationService } from '@feathersjs/authentication'
import { WristbandJWTStrategy } from '../../src/strategy/wristband.strategy'
import { wristbandKoaBridge } from '../../src/adapter/wristband-koa'
import { registerWristbandService } from '../../src/services/wristband.service'
import { wristbandGuard } from '../../src/hooks/wristband-guard'

export async function createTestApp() {
  const app = koa(feathers())

  app.use(errorHandler())
  app.use(bodyParser())

  wristbandKoaBridge(
    app,
    {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      loginStateSecret: 'state-secret-123456789012345678901234',
      loginUrl: 'https://customer.test-app.io/auth/login',
      redirectUri: 'https://customer.test-app.io/auth/callback',
      wristbandApplicationDomain: 'test-vanity'
    },
    {
      secrets: '0123456789abcdef0123456789abcdef',
      maxAge: 86400,
      secure: false
    }
  )

  app.configure(rest())

  app.set('authentication', {
    secret: 'test-secret',
    authStrategies: ['wristband'],
    service: null,
    entity: null,
    wristband: {
      issuer: 'test-vanity',
      audience: 'test-audience'
    }
  })

  const authentication = new AuthenticationService(app)
  authentication.register('wristband', new WristbandJWTStrategy())

  app.use('authentication', authentication)

  registerWristbandService(app)

  app.use('invoices', {
    async find() {
      return [{ id: 1, total: 42 }]
    }
  })

  app.service('invoices').hooks({
    before: {
      all: [wristbandGuard({ allowSessionFallbackOnBadJWT: true })]
    }
  })

  return app
}
