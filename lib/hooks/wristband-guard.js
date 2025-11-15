"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wristbandGuard = void 0;
const BEARER_PREFIX = 'Bearer ';
function createHttpError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}
const wristbandGuard = (options = {}) => async (context) => {
    const { app, params } = context;
    const headers = params.headers || {};
    const authHeader = (headers.authorization || headers.Authorization);
    let jwtSucceeded = false;
    if (authHeader?.startsWith(BEARER_PREFIX)) {
        const accessToken = authHeader.slice(BEARER_PREFIX.length);
        const authService = app.service('authentication');
        if (!authService || typeof authService.authenticate !== 'function') {
            throw createHttpError('Authentication service not available', 500);
        }
        try {
            const result = await authService.authenticate({ strategy: 'wristband', accessToken });
            params.authentication = result.authentication;
            if (result.user) {
                ;
                params.user = result.user;
            }
            params.authenticated = true;
            jwtSucceeded = true;
        }
        catch (error) {
            if (!options.allowSessionFallbackOnBadJWT) {
                throw createHttpError('Invalid access token', 401);
            }
        }
    }
    if (!jwtSucceeded) {
        const session = params.session;
        if (session?.accessToken) {
            params.authenticated = true;
            return context;
        }
        throw createHttpError('Not authenticated', 401);
    }
    return context;
};
exports.wristbandGuard = wristbandGuard;
