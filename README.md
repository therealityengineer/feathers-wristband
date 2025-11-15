# feathers-wristband

FeathersJS v5 service adapter for integrating Wristband authentication with the official Koa transport. It provides a production-ready bridge that combines Wristband's OAuth/OIDC login flows, encrypted cookie sessions, and JWT validation into Feathers services and hooks.

## Installation

```bash
npm install feathers-wristband @feathersjs/feathers @feathersjs/koa @feathersjs/authentication
```

You will also need the Wristband SDK credentials for your application.

## Usage

```ts
import { feathers } from '@feathersjs/feathers'
import { koa, rest, errorHandler, bodyParser } from '@feathersjs/koa'
import { AuthenticationService } from '@feathersjs/authentication'
import {
  wristbandKoaBridge,
  registerWristbandService,
  WristbandJWTStrategy,
  wristbandGuard
} from 'feathers-wristband'

const app = koa(feathers())

app.use(errorHandler())
app.use(bodyParser())

wristbandKoaBridge(
  app,
  {
    clientId: process.env.WRISTBAND_CLIENT_ID!,
    clientSecret: process.env.WRISTBAND_CLIENT_SECRET!,
    loginStateSecret: process.env.WRISTBAND_LOGIN_STATE_SECRET!,
    loginUrl: 'https://{tenant_domain}.example.com/auth/login',
    redirectUri: 'https://{tenant_domain}.example.com/auth/callback',
    wristbandApplicationDomain: process.env.WRISTBAND_APPLICATION_DOMAIN!,
    dangerouslyDisableSecureCookies: process.env.NODE_ENV !== 'production'
  },
  {
    secrets: process.env.SESSION_SECRET!,
    maxAge: 86400,
    secure: process.env.NODE_ENV === 'production',
    cookieName: 'wb_session'
  }
)

app.configure(rest())

app.set('authentication', {
  secret: process.env.AUTH_SECRET!,
  authStrategies: ['wristband'],
  wristband: {
    issuer: process.env.WRISTBAND_APPLICATION_DOMAIN!,
    audience: process.env.WRISTBAND_API_AUDIENCE
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

app.listen(3030)
```

### Required environment variables

- `WRISTBAND_CLIENT_ID`, `WRISTBAND_CLIENT_SECRET` – credentials from the Wristband dashboard.
- `WRISTBAND_LOGIN_STATE_SECRET` – at least 32 characters; used to encrypt Wristband login state cookies.
- `WRISTBAND_APPLICATION_DOMAIN` – your Wristband vanity domain (e.g. `app.your-org.us.wristband.dev`), also used as the JWT issuer.
- `WRISTBAND_API_AUDIENCE` – optional API audience claim that the JWT strategy validates.
- `SESSION_SECRET` – 32+ character encryption secret for `@wristband/typescript-session` cookies.
- `AUTH_SECRET` – Feathers authentication secret used when issuing its own JWTs (even if you only rely on Wristband).

### REST endpoints

The Wristband service registers at `/auth/wristband` with Feathers custom methods accessible through the `X-Service-Method` header when using REST.

| Method      | Description                                   |
|-------------|-----------------------------------------------|
| `login`     | Starts the OAuth login flow. Returns 302 to Wristband. |
| `callback`  | Completes OAuth callback, persists session, redirects to the requested URL. |
| `logout`    | Destroys session and redirects to Wristband logout. |
| `session`   | Returns the current session payload. Adds `Cache-Control: no-store`. |
| `token`     | Returns token response from the encrypted session. |

Example REST call:

```bash
curl -i -X POST \
  -H 'X-Service-Method: login' \
  http://localhost:3030/auth/wristband
```

Login, callback, and logout respond with HTTP 302 when accessed via REST thanks to `redirectAfterHook`. Session responses include `Cache-Control: no-store` and `Pragma: no-cache` via `noStoreAfterHook`.

## Hooks

- `wristbandGuard` — unified guard that tries JWT auth and falls back to cookie sessions.
- `csrfProtectHook` — synchronizer token CSRF protection for mutating external calls.
- `redirectAfterHook` — converts `{ redirectUrl }` results into HTTP redirects for REST providers.
- `noStoreAfterHook` — adds anti-caching headers to session responses.

## Testing

```bash
npm test
```

Mocha, Chai, and Supertest cover the Wristband service, JWT strategy, and guard hook with mocked Wristband SDKs.
