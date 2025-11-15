"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WristbandService = void 0;
exports.registerWristbandService = registerWristbandService;
const wristband_koa_1 = require("../adapter/wristband-koa");
const http_redirects_1 = require("../hooks/http-redirects");
class WristbandService {
    async login(data, params) {
        const loginData = data || {};
        (0, wristband_koa_1.getKoaContext)(params);
        const auth = (0, wristband_koa_1.getWristbandAuthFromParams)(params);
        const express = (0, wristband_koa_1.getExpressContext)(params);
        if (loginData.tenantName) {
            express.req.query.tenant_domain = loginData.tenantName;
        }
        if (loginData.returnUrl) {
            express.req.query.return_url = loginData.returnUrl;
        }
        if (loginData.tenantCustomDomain) {
            express.req.headers.host = loginData.tenantCustomDomain;
        }
        await auth.login(express.req, express.res, {
            defaultTenantDomain: loginData.tenantName
        });
        const redirectUrl = express.res.getRedirectUrl();
        if (!redirectUrl) {
            throw Object.assign(new Error('Login redirect missing'), { code: 500 });
        }
        return { redirectUrl };
    }
    async callback(_data, params) {
        (0, wristband_koa_1.getKoaContext)(params);
        const auth = (0, wristband_koa_1.getWristbandAuthFromParams)(params);
        const session = (0, wristband_koa_1.getSessionFromParams)(params);
        const express = (0, wristband_koa_1.getExpressContext)(params);
        const result = await auth.callback(express.req, express.res);
        if (!result) {
            const redirectUrl = express.res.getRedirectUrl();
            if (!redirectUrl) {
                throw Object.assign(new Error('Callback redirect missing'), { code: 500 });
            }
            return { redirectUrl };
        }
        session.fromCallback(result);
        await session.save();
        const returnUrl = result.returnUrl ?? '/';
        return { redirectUrl: returnUrl };
    }
    async logout(_data, params) {
        (0, wristband_koa_1.getKoaContext)(params);
        const auth = (0, wristband_koa_1.getWristbandAuthFromParams)(params);
        const session = (0, wristband_koa_1.getSessionFromParams)(params);
        const express = (0, wristband_koa_1.getExpressContext)(params);
        const { refreshToken, tenantCustomDomain, tenantName } = session;
        session.destroy();
        await auth.logout(express.req, express.res, {
            refreshToken,
            tenantDomainName: tenantCustomDomain ?? tenantName
        });
        const redirectUrl = express.res.getRedirectUrl();
        if (!redirectUrl) {
            throw Object.assign(new Error('Logout redirect missing'), { code: 500 });
        }
        return { redirectUrl };
    }
    async session(_data, params) {
        const session = (0, wristband_koa_1.getSessionFromParams)(params);
        return session.getSessionResponse();
    }
    async token(_data, params) {
        const session = (0, wristband_koa_1.getSessionFromParams)(params);
        return session.getTokenResponse();
    }
}
exports.WristbandService = WristbandService;
function registerWristbandService(app) {
    const service = new WristbandService();
    app.use('auth/wristband', service, {
        methods: ['login', 'callback', 'logout', 'session', 'token'],
        events: []
    });
    const wristbandService = app.service('auth/wristband');
    wristbandService.hooks({
        before: {},
        after: {
            login: [http_redirects_1.redirectAfterHook],
            callback: [http_redirects_1.redirectAfterHook],
            logout: [http_redirects_1.redirectAfterHook],
            session: [http_redirects_1.noStoreAfterHook]
        }
    });
}
