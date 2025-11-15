"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectAfterHook = redirectAfterHook;
exports.noStoreAfterHook = noStoreAfterHook;
async function redirectAfterHook(context) {
    if (context.params.provider === 'rest' && context.result && 'redirectUrl' in context.result) {
        context.http = {
            ...(context.http || {}),
            status: 302,
            location: context.result.redirectUrl
        };
        context.result = { ok: true };
    }
    return context;
}
async function noStoreAfterHook(context) {
    if (context.params.provider === 'rest') {
        context.http = {
            ...(context.http || {}),
            headers: {
                ...(context.http?.headers || {}),
                'Cache-Control': 'no-store',
                Pragma: 'no-cache'
            }
        };
    }
    return context;
}
