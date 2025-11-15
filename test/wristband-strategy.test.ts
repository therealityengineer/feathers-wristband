import { expect } from 'chai'
import { WristbandJWTStrategy } from '../src/strategy/wristband.strategy'
import { resetMockState } from './helpers/mock-wristband'

describe('WristbandJWTStrategy', () => {
  beforeEach(() => {
    resetMockState()
  })

  function createStrategy() {
    const strategy = new WristbandJWTStrategy()
    ;(strategy as any).authentication = {
      configuration: {
        wristband: {
          issuer: 'test-issuer',
          audience: 'test-audience'
        }
      }
    }
    return strategy
  }

  it('parses bearer token', async () => {
    const strategy = createStrategy()
    const parsed = await strategy.parse({ headers: { authorization: 'Bearer TOKEN' } })
    expect(parsed).to.deep.equal({ strategy: 'wristband', accessToken: 'TOKEN' })
  })

  it('authenticates valid token', async () => {
    const strategy = createStrategy()
    const result = await strategy.authenticate({ accessToken: 'GOOD_TOKEN' })

    expect(result.authentication).to.deep.equal({ strategy: 'wristband' })
    expect(result.user).to.include({ sub: 'user-123', email: 'user@example.com', tenant: 'tenant-1' })
    expect(result.accessToken).to.equal('GOOD_TOKEN')
  })

  it('rejects invalid token', async () => {
    const strategy = createStrategy()

    let error: any
    try {
      await strategy.authenticate({ accessToken: 'BAD_TOKEN' })
    } catch (err: any) {
      error = err
    }

    expect(error).to.exist
  })

  it('reads configuration from authentication service', async () => {
    const strategy = createStrategy()
    const config = await strategy.getConfiguration()
    expect(config).to.deep.include({ issuer: 'test-issuer', audience: 'test-audience', name: 'wristband' })
  })
})
