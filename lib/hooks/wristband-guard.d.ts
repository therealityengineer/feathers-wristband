import type { HookContext } from '@feathersjs/feathers';
import type { WristbandGuardOptions } from '../types';
export declare const wristbandGuard: (options?: WristbandGuardOptions) => (context: HookContext) => Promise<HookContext<import("@feathersjs/feathers").Application<any, any>, any>>;
