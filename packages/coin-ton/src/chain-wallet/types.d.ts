/**
 * Common error response structure from TON network
 */
export interface ErrorWithResponse {
    response?: {
        status?: number;
        data?: {
            error?: string;
        };
    };
    message?: string;
}
/**
 * TON wallet options for configuration
 */
export interface TonWalletOptions {
    keyDerivationMethod?: 'ton-native' | 'ed25519';
}
/**
 * TON's KeyPair type from @ton/crypto
 */
export interface TonKeyPair {
    publicKey: Buffer;
    secretKey: Buffer;
}
