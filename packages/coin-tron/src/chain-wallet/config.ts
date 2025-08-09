import { ChainType } from '@delandlabs/hibit-basic-types';
import { createChainRetry, Cacheable, Memoize } from '@delandlabs/coin-base';

/**
 * Unified configuration for TRON blockchain integration.
 *
 * This file consolidates all configuration constants, following the
 * established patterns from coin-ethereum for consistency and maintainability.
 */

// ============================================================
// Chain Configuration
// ============================================================
export const CHAIN_CONFIG = {
  // Chain identification
  CHAIN: ChainType.Tron,
  CHAIN_NAME: 'TRON',
  DERIVING_PATH: "m/44'/195'/0'/0/0",

  // Cryptographic and Network Constants
  ADDRESS_PREFIX_BYTE: 0x41,
  SUN_TO_TRX_RATIO: 1000000, // 1 TRX = 10^6 sun
  MAX_DECIMALS: 77, // TRON maximum token decimals
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,

  // Fee and Resource Constants
  BASE_BANDWIDTH_FEE: '0.1', // TRX
  ENERGY_BURN_ESTIMATE: '15', // TRX for contract calls without energy

  // Native transaction estimates
  NATIVE_TRANSFER_BANDWIDTH: 267, // Typical bandwidth for native TRX transfer
  BANDWIDTH_PRICE: 1000, // Sun per bandwidth unit

  // TRC20 transaction estimates
  TRC20_TRANSFER_ENERGY: 15000, // Typical energy for TRC20 transfer
  TRC20_TRANSFER_BANDWIDTH: 350, // Typical bandwidth for contract call
  ENERGY_PRICE: 420, // Sun per energy unit
  TRC20_FEE_LIMIT: 100_000_000 // 100 TRX fee limit for TRC20 operations
} as const;

// ============================================================
// Cache Configuration
// ============================================================
export const CACHE_CONFIG = {
  TTL: {
    ACCOUNT_INFO: 30000, // 30 seconds
    NETWORK_PARAMS: 300000, // 5 minutes
    TOKEN_INFO: 600000, // 10 minutes
    DECIMALS: 3600000 // 1 hour
  },
  SIZE: {
    ACCOUNT_INFO: 100,
    NETWORK_PARAMS: 10,
    TOKEN_INFO: 500,
    DECIMALS: 100
  }
} as const;

// ============================================================
// Error Messages
// ============================================================
export const ERROR_MESSAGES = {
  INVALID_CHAIN: `${CHAIN_CONFIG.CHAIN_NAME}: Invalid chain type`,
  INVALID_ADDRESS: `${CHAIN_CONFIG.CHAIN_NAME}: Invalid address format`,
  INVALID_TOKEN: `${CHAIN_CONFIG.CHAIN_NAME}: Invalid TRC20 contract address`,
  NETWORK_ERROR: `${CHAIN_CONFIG.CHAIN_NAME}: Network error`,
  TRANSFER_FAILED: `${CHAIN_CONFIG.CHAIN_NAME}: Transfer failed`,
  FEE_ESTIMATION_FAILED: `${CHAIN_CONFIG.CHAIN_NAME}: Fee estimation failed`,
  MESSAGE_SIGNING_FAILED: `${CHAIN_CONFIG.CHAIN_NAME}: Message signing failed`,
  NOT_INITIALIZED: `${CHAIN_CONFIG.CHAIN_NAME}: Wallet not initialized`
} as const;

// ============================================================
// Network Error Patterns and Retry Configuration
// ============================================================
export const NETWORK_ERROR_PATTERNS = [
  'network',
  'timeout',
  'connection',
  'fetch failed',
  'request failed',
  'connect failed',
  'rpc',
  'trongrid',
  'econnreset',
  'etimedout'
] as const;

export const DEFAULT_RETRY_CONFIG = {
  retries: 3,
  retryDelay: 1000,
  backoffFactor: 2,
  maxRetryDelay: 5000
} as const;

// ============================================================
// Chain-specific Decorators
// ============================================================

// Retry decorator for TRON operations
export const TronRetry = createChainRetry(CHAIN_CONFIG.CHAIN_NAME, NETWORK_ERROR_PATTERNS, DEFAULT_RETRY_CONFIG);

// Caching decorator for account resources
export const CacheAccountResources = Cacheable({
  ttl: CACHE_CONFIG.TTL.ACCOUNT_INFO,
  max: CACHE_CONFIG.SIZE.ACCOUNT_INFO
});

// Caching decorator for token info
export const CacheTokenInfo = Cacheable({
  ttl: CACHE_CONFIG.TTL.TOKEN_INFO,
  max: CACHE_CONFIG.SIZE.TOKEN_INFO
});

// Memoize decorator for token decimals (with retry handled separately)
export const MemoizeTokenDecimals = Memoize({
  ttl: CACHE_CONFIG.TTL.DECIMALS,
  key: (tokenAddress: string) => `tron-token-decimals:${tokenAddress}`
});
