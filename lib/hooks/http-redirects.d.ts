import type { HookContext } from '@feathersjs/feathers';
export declare function redirectAfterHook(context: HookContext): Promise<HookContext<import("@feathersjs/feathers").Application<any, any>, any>>;
export declare function noStoreAfterHook(context: HookContext): Promise<HookContext<import("@feathersjs/feathers").Application<any, any>, any>>;
