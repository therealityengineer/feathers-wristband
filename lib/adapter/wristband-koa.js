"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wristbandKoaBridge = wristbandKoaBridge;
exports.getKoaContext = getKoaContext;
exports.getSessionFromParams = getSessionFromParams;
exports.getWristbandAuthFromParams = getWristbandAuthFromParams;
exports.getExpressContext = getExpressContext;
const express_auth_1 = require("@wristband/express-auth");
const typescript_session_1 = require("@wristband/typescript-session");
class ExpressResponseAdapter {
    constructor(ctx) {
        this.ctx = ctx;
    }
    header(name, value) {
        this.ctx.set(name, value);
        return this;
    }
    redirect(url) {
        this.redirectUrl = url;
        return url;
    }
    cookie(name, value, options = {}) {
        const sameSite = options.sameSite === true ? 'strict' : options.sameSite === false ? undefined : options.sameSite;
        this.ctx.cookies.set(name, value, {
            httpOnly: options.httpOnly ?? true,
            maxAge: options.maxAge,
            overwrite: true,
            path: options.path ?? '/',
            sameSite,
            secure: options.secure
        });
        return this;
    }
    clearCookie(name) {
        this.ctx.cookies.set(name, '', {
            expires: new Date(0),
            httpOnly: true,
            overwrite: true,
            path: '/'
        });
        return this;
    }
    getRedirectUrl() {
        return this.redirectUrl;
    }
}
function parseCookies(cookieHeader) {
    if (!cookieHeader) {
        return {};
    }
    return cookieHeader.split(';').reduce((acc, part) => {
        const index = part.indexOf('=');
        if (index === -1) {
            return acc;
        }
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (key) {
            acc[key] = decodeURIComponent(value);
        }
        return acc;
    }, {});
}
function createExpressRequest(ctx) {
    const base = Object.create(ctx.req);
    base.headers = ctx.req.headers;
    base.query = { ...ctx.request.query };
    base.cookies = parseCookies(ctx.headers.cookie);
    return base;
}
function createExpressContext(ctx) {
    return {
        req: createExpressRequest(ctx),
        res: new ExpressResponseAdapter(ctx)
    };
}
function wristbandKoaBridge(app, authConfig, sessionConfig) {
    const wristbandAuth = (0, express_auth_1.createWristbandAuth)(authConfig);
    app.use(async (ctx, next) => {
        const options = {
            secrets: sessionConfig.secrets,
            maxAge: sessionConfig.maxAge ?? 86400,
            cookieName: sessionConfig.cookieName ?? 'wb_session',
            secure: sessionConfig.secure ?? true
        };
        const session = (await (0, typescript_session_1.getSession)(ctx.req, ctx.res, options));
        const feathers = (ctx.feathers ?? {});
        const express = createExpressContext(ctx);
        feathers.koa = { ctx };
        feathers.session = session;
        feathers.wristbandAuth = wristbandAuth;
        feathers.express = express;
        ctx.feathers = feathers;
        await next();
    });
    return wristbandAuth;
}
function isHookContext(value) {
    return value.params !== undefined;
}
function getParams(pc) {
    if (isHookContext(pc)) {
        return pc.params;
    }
    return pc;
}
function getKoaContext(pc) {
    const params = getParams(pc);
    const koa = params.koa;
    if (!koa) {
        throw Object.assign(new Error('Koa context not found on params. Did you configure wristbandKoaBridge?'), {
            code: 500
        });
    }
    return koa.ctx;
}
function getSessionFromParams(pc) {
    const params = getParams(pc);
    const session = params.session;
    if (!session) {
        throw Object.assign(new Error('Wristband session not found on params'), {
            code: 500
        });
    }
    return session;
}
function getWristbandAuthFromParams(pc) {
    const params = getParams(pc);
    const auth = params.wristbandAuth;
    if (!auth) {
        throw Object.assign(new Error('Wristband auth instance not found on params'), {
            code: 500
        });
    }
    return auth;
}
function getExpressContext(pc) {
    const params = getParams(pc);
    const express = params.express;
    if (!express) {
        throw Object.assign(new Error('Express adapters not found on params'), {
            code: 500
        });
    }
    return express;
}
