import { AuthenticationBaseStrategy, type AuthenticationResult } from '@feathersjs/authentication';
import type { Params } from '@feathersjs/feathers';
import type { WristbandJWTConfig } from '../types';
export declare class WristbandJWTStrategy extends AuthenticationBaseStrategy {
    private validator?;
    getConfiguration(): Promise<WristbandJWTConfig & {
        name: string;
    }>;
    parse(req: any): Promise<{
        strategy: string;
        accessToken: string;
    } | null>;
    authenticate(data: any, _params?: Params): Promise<AuthenticationResult>;
}
