import type { Application, HookContext, Params } from '@feathersjs/feathers';
import type { IncomingHttpHeaders } from 'http';
import type { Context as KoaContext } from 'koa';
import { createWristbandAuth } from '@wristband/express-auth';
import type { WristbandAuthConfig, WristbandSessionConfig, WristbandSession } from '../types';
export type KoaFeathersApp = Application & {
    use: (middleware: (ctx: KoaContext, next: () => Promise<void>) => Promise<void> | void) => void;
};
type WristbandAuthInstance = ReturnType<typeof createWristbandAuth>;
type ExpressLikeRequest = {
    query: Record<string, any>;
    cookies: Record<string, string>;
    headers: IncomingHttpHeaders;
};
type ExpressLikeContext = {
    req: ExpressLikeRequest;
    res: ExpressResponseAdapter;
};
type CookieOptions = {
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: 'lax' | 'strict' | 'none' | boolean;
    secure?: boolean;
};
declare class ExpressResponseAdapter {
    private readonly ctx;
    private redirectUrl?;
    constructor(ctx: KoaContext);
    header(name: string, value: string): this;
    redirect(url: string): string;
    cookie(name: string, value: string, options?: CookieOptions): this;
    clearCookie(name: string): this;
    getRedirectUrl(): string | undefined;
}
export declare function wristbandKoaBridge(app: KoaFeathersApp, authConfig: WristbandAuthConfig, sessionConfig: WristbandSessionConfig): WristbandAuthInstance;
type ParamsOrContext = Params | HookContext;
export declare function getKoaContext(pc: ParamsOrContext): KoaContext;
export declare function getSessionFromParams(pc: ParamsOrContext): WristbandSession;
export declare function getWristbandAuthFromParams(pc: ParamsOrContext): WristbandAuthInstance;
export declare function getExpressContext(pc: ParamsOrContext): ExpressLikeContext;
export {};
