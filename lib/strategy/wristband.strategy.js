"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WristbandJWTStrategy = void 0;
const authentication_1 = require("@feathersjs/authentication");
const typescript_jwt_1 = require("@wristband/typescript-jwt");
class WristbandJWTStrategy extends authentication_1.AuthenticationBaseStrategy {
    async getConfiguration() {
        const base = (this.authentication?.configuration?.wristband || {});
        return {
            name: 'wristband',
            ...base
        };
    }
    async parse(req) {
        const authHeader = req?.headers?.authorization;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return {
                strategy: 'wristband',
                accessToken: authHeader.slice('Bearer '.length)
            };
        }
        return null;
    }
    async authenticate(data, _params) {
        const accessToken = data?.accessToken;
        if (!accessToken) {
            throw Object.assign(new Error('No access token provided'), { code: 400 });
        }
        const config = await this.getConfiguration();
        if (!config.issuer) {
            throw Object.assign(new Error('Wristband issuer is not configured'), { code: 500 });
        }
        if (!this.validator) {
            this.validator = (0, typescript_jwt_1.createWristbandJwtValidator)({
                wristbandApplicationVanityDomain: config.issuer
            });
        }
        const validator = this.validator;
        if (!validator) {
            throw Object.assign(new Error('Failed to initialize Wristband validator'), { code: 500 });
        }
        const validationResult = await validator.validate(accessToken);
        if (!validationResult.isValid || !validationResult.payload) {
            throw Object.assign(new Error(validationResult.errorMessage ?? 'Invalid access token'), {
                code: 401
            });
        }
        const claims = validationResult.payload;
        if (config.audience) {
            const expectedAudiences = Array.isArray(config.audience) ? config.audience : [config.audience];
            let tokenAudValues = [];
            if (Array.isArray(claims.aud)) {
                tokenAudValues = claims.aud;
            }
            else if (typeof claims.aud === 'string') {
                tokenAudValues = [claims.aud];
            }
            const audienceMatch = tokenAudValues.length > 0 && tokenAudValues.some((aud) => expectedAudiences.includes(aud));
            if (!audienceMatch) {
                throw Object.assign(new Error('Invalid audience'), { code: 401 });
            }
        }
        const user = {
            sub: claims.sub,
            email: claims.email,
            tenant: claims['wb:tenant'] ?? claims.tenant
        };
        return {
            accessToken,
            authentication: { strategy: 'wristband' },
            user
        };
    }
}
exports.WristbandJWTStrategy = WristbandJWTStrategy;
