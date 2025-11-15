import type { Application, Params } from '@feathersjs/feathers';
import type { LoginData, LogoutData, CallbackData, SessionData, TokenData } from '../types';
export declare class WristbandService {
    login(data: LoginData, params: Params): Promise<{
        redirectUrl: string;
    }>;
    callback(_data: CallbackData, params: Params): Promise<{
        redirectUrl: string;
    }>;
    logout(_data: LogoutData, params: Params): Promise<{
        redirectUrl: string;
    }>;
    session(_data: SessionData, params: Params): Promise<any>;
    token(_data: TokenData, params: Params): Promise<any>;
}
export declare function registerWristbandService(app: Application): void;
