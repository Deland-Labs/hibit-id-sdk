import BigNumber from 'bignumber.js';
import { ChainType } from '@delandlabs/hibit-basic-types';
import { createChainRetry } from '@delandlabs/coin-base';

/**
 * TON Chain configuration constants
 */
export const TON_CONFIG = {
  // Chain and asset types (merged from defaults.ts)
  get CHAIN() {
    return ChainType.Ton;
  },
  CHAIN_NAME: 'TON',

  // Derivation path (merged from defaults.ts)
  DERIVING_PATH: "m/44'/607'/0'",

  // Transaction fees (lazy initialization to avoid module loading issues)
  get JETTON_TRANSFER_AMOUNT() {
    return new BigNumber(0.1);
  },
  get JETTON_FORWARD_AMOUNT() {
    return new BigNumber(0.0001);
  },

  // Retry configuration
  MAX_RETRIES: 10,
  RETRY_DELAY_MS: 3000,

  // Timeout configuration
  CONFIRMATION_TIMEOUT_MS: 30000, // 30 seconds for production
  CONFIRMATION_CHECK_INTERVAL_MS: 2000, // 2 seconds interval - reasonable for blockchain polling
  DEFAULT_JETTON_DECIMALS: 9,

  // Gas limits
  NATIVE_TRANSFER_GAS_AMOUNT: '0.01',
  JETTON_TRANSFER_GAS_LIMIT: '0.05',

  // Safe sign constants
  MAGIC: 'ton-safe-sign-magic',
  TON_SAFE_SIGN_PREFIX: [0xff, 0xff] as const,

  // Cache configuration
  DECIMALS_CACHE_TTL_MS: 3600000, // 1 hour
  DECIMALS_CACHE_MAX_SIZE: 100, // Maximum number of cached entries

  // Jetton operation codes
  JETTON_TRANSFER_OPCODE: 0x0f8a7ea5, // opcode for jetton transfer
  JETTON_COMMENT_OPCODE: 0 // 0 opcode means we have a comment
} as const;

/**
 * Cache configuration for TON chain wallet operations
 */
export const TON_CACHE_CONFIG = {
  /**
   * Jetton decimals cache configuration
   * Decimals rarely change, so longer TTL is appropriate
   */
  JETTON_DECIMALS: {
    ttl: 30 * 60 * 1000, // 30 minutes
    max: 100, // Cache up to 100 different Jetton decimals
    key: (jettonMasterAddress: string) => `ton:jetton-decimals:${jettonMasterAddress}`
  },

  /**
   * Jetton wallet contract cache configuration
   * Wallet addresses are deterministic, so can be cached with medium TTL
   */
  JETTON_WALLET: {
    ttl: 10 * 60 * 1000, // 10 minutes
    max: 50, // Cache up to 50 jetton wallet contracts
    key: (ownerAddress: string, contractAddress: string) => `ton:jetton-wallet:${ownerAddress}:${contractAddress}`
  },

  /**
   * Network RPC endpoint cache configuration
   * RPC endpoints are stable
   */
  RPC_ENDPOINT: {
    ttl: 60 * 60 * 1000, // 1 hour
    max: 5, // Few different networks
    key: (network: string) => `ton:rpc-endpoint:${network}`
  }
} as const;

/**
 * Get magic bytes length
 */
export const MAGIC_BYTES = new TextEncoder().encode(TON_CONFIG.MAGIC).length;

/**
 * TON-specific error patterns for retry logic
 */
const TON_ERROR_PATTERNS = ['seqno', 'too_old', 'external', 'ton_rpc_error', 'jetton', 'insufficient'] as const;

/**
 * Pre-configured TON retry decorator with chain-specific settings
 * Fixed to use immediate initialization to avoid decorator execution timing issues
 */
export const TonRetry = createChainRetry('TON', TON_ERROR_PATTERNS, {
  retries: TON_CONFIG.MAX_RETRIES,
  minTimeout: TON_CONFIG.RETRY_DELAY_MS,
  logger: function (this: any) {
    return this.logger;
  }
});

/**
 * Cache eviction patterns for operations that invalidate cached data
 * Note: Balance queries and fee estimates are not cached per requirements
 */
export const TON_CACHE_EVICTION = {
  /**
   * Patterns to evict when wallet is destroyed
   */
  WALLET_DESTROY: {
    patterns: [
      () => 'ton:*' // Clear all TON-related caches
    ]
  }
} as const;

/**
 * Helper function to create cache key with consistent formatting
 */
export function createCacheKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  const cleanParts = parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) =>
      String(part)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
    );

  return `${prefix}:${cleanParts.join(':')}`;
}

/**
 * Helper function to check if a cache configuration is valid
 */
export function validateCacheConfig(config: { ttl?: number; max?: number; key: Function }): boolean {
  return (
    typeof config.key === 'function' &&
    (config.ttl === undefined || (typeof config.ttl === 'number' && config.ttl > 0)) &&
    (config.max === undefined || (typeof config.max === 'number' && config.max > 0))
  );
}
