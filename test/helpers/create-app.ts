import { feathers } from '@feathersjs/feathers'
import { koa, rest, errorHandler, bodyParser } from '@feathersjs/koa'
import { authentication } from '@feathersjs/authentication'
import { WristbandJWTStrategy } from '../../src/strategy/wristband.strategy'
import { wristbandKoaBridge } from '../../src/adapter/wristband-koa'
import { registerWristbandService } from '../../src/services/wristband.service'
import { wristbandGuard } from '../../src/hooks/wristband-guard'

export async function createTestApp() {
  const app = koa(feathers())

  app.use(errorHandler())
  app.use(bodyParser())

  wristbandKoaBridge(
    app as any,
    {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      wristbandApplicationVanityDomain: 'test-vanity'
    },
    {
      secrets: 'test-secret',
      maxAge: 86400,
      secure: false
    }
  )

  app.configure(rest())
  app.configure(authentication({ authStrategies: ['wristband'] }))
  app.authentication.register('wristband', new WristbandJWTStrategy())

  registerWristbandService(app as any)

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
