"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtectHook = void 0;
const METHODS_REQUIRING_CSRF = new Set(['create', 'update', 'patch', 'remove']);
const csrfProtectHook = async (context) => {
    if (!context.params.provider) {
        return context;
    }
    if (!METHODS_REQUIRING_CSRF.has(context.method)) {
        return context;
    }
    const session = context.params.session;
    if (!session?.csrfToken) {
        const error = new Error('Forbidden (CSRF)');
        error.code = 403;
        throw error;
    }
    const headers = context.params.headers || {};
    const csrfHeader = (headers['x-csrf-token'] || headers['X-CSRF-TOKEN']);
    if (!csrfHeader || csrfHeader !== session.csrfToken) {
        const error = new Error('Forbidden (CSRF)');
        error.code = 403;
        throw error;
    }
    return context;
};
exports.csrfProtectHook = csrfProtectHook;
