import BigNumber from 'bignumber.js';
/**
 * TON Chain configuration constants
 */
export declare const TON_CONFIG: {
    readonly CHAIN: 607;
    readonly CHAIN_NAME: "TON";
    readonly DERIVING_PATH: "m/44'/607'/0'";
    readonly JETTON_TRANSFER_AMOUNT: BigNumber;
    readonly JETTON_FORWARD_AMOUNT: BigNumber;
    readonly MAX_RETRIES: 10;
    readonly RETRY_DELAY_MS: 3000;
    readonly CONFIRMATION_TIMEOUT_MS: 30000;
    readonly CONFIRMATION_CHECK_INTERVAL_MS: 2000;
    readonly DEFAULT_JETTON_DECIMALS: 9;
    readonly NATIVE_TRANSFER_GAS_AMOUNT: "0.01";
    readonly JETTON_TRANSFER_GAS_LIMIT: "0.05";
    readonly MAGIC: "ton-safe-sign-magic";
    readonly TON_SAFE_SIGN_PREFIX: readonly [255, 255];
    readonly DECIMALS_CACHE_TTL_MS: 3600000;
    readonly DECIMALS_CACHE_MAX_SIZE: 100;
    readonly JETTON_TRANSFER_OPCODE: 260734629;
    readonly JETTON_COMMENT_OPCODE: 0;
};
/**
 * Cache configuration for TON chain wallet operations
 */
export declare const TON_CACHE_CONFIG: {
    /**
     * Jetton decimals cache configuration
     * Decimals rarely change, so longer TTL is appropriate
     */
    readonly JETTON_DECIMALS: {
        readonly ttl: number;
        readonly max: 100;
        readonly key: (jettonMasterAddress: string) => string;
    };
    /**
     * Jetton wallet contract cache configuration
     * Wallet addresses are deterministic, so can be cached with medium TTL
     */
    readonly JETTON_WALLET: {
        readonly ttl: number;
        readonly max: 50;
        readonly key: (ownerAddress: string, contractAddress: string) => string;
    };
    /**
     * Network RPC endpoint cache configuration
     * RPC endpoints are stable
     */
    readonly RPC_ENDPOINT: {
        readonly ttl: number;
        readonly max: 5;
        readonly key: (network: string) => string;
    };
};
/**
 * Get magic bytes length
 */
export declare const MAGIC_BYTES: number;
/**
 * Pre-configured TON retry decorator with chain-specific settings
 * Fixed to use immediate initialization to avoid decorator execution timing issues
 */
export declare const TonRetry: (options?: import("@delandlabs/coin-base").RetryOptions) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Cache eviction patterns for operations that invalidate cached data
 * Note: Balance queries and fee estimates are not cached per requirements
 */
export declare const TON_CACHE_EVICTION: {
    /**
     * Patterns to evict when wallet is destroyed
     */
    readonly WALLET_DESTROY: {
        readonly patterns: readonly [() => string];
    };
};
/**
 * Helper function to create cache key with consistent formatting
 */
export declare function createCacheKey(prefix: string, ...parts: (string | number | undefined)[]): string;
/**
 * Helper function to check if a cache configuration is valid
 */
export declare function validateCacheConfig(config: {
    ttl?: number;
    max?: number;
    key: Function;
}): boolean;
