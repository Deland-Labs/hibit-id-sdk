import { ChainType } from '@delandlabs/hibit-basic-types';
import { Commitment } from '@solana/web3.js';
import { createChainRetry } from '@delandlabs/coin-base';

/**
 * Configuration constants for Solana blockchain wallet operations.
 * Merged from defaults.ts to centralize all configuration.
 */

// ============================================================
// Chain Configuration Constants
// ============================================================

/** The human-readable name of the Solana blockchain */
export const CHAIN_NAME = 'Solana';

/** The chain type identifier for Solana */
export const CHAIN = ChainType.Solana;

/** BIP44 derivation path for Solana wallets */
export const DERIVING_PATH = "m/44'/501'/0'/0'";

/** Default commitment level for Solana transactions */
export const DEFAULT_COMMITMENT: Commitment = 'confirmed';

// ============================================================
// Transaction Confirmation Configuration
// ============================================================

/** Default timeout for transaction confirmation in milliseconds (based on blockhash expiration) */
export const DEFAULT_CONFIRMATION_TIMEOUT_MS = 90000; // 90 seconds

/** Default polling interval for transaction status checks in milliseconds */
export const DEFAULT_CONFIRMATION_POLL_INTERVAL_MS = 1000; // 1 second

/** Maximum polling interval for transaction status checks in milliseconds */
export const MAX_CONFIRMATION_POLL_INTERVAL_MS = 5000; // 5 seconds

export const CHAIN_CONFIG = {
  CHAIN: 'Solana',
  CHAIN_NAME: 'Solana',
  DERIVING_PATH: DERIVING_PATH
} as const;

export const ERROR_MESSAGES = {
  INVALID_CHAIN: 'Invalid chain type for Solana wallet',
  NOT_INITIALIZED: 'Solana wallet not initialized'
} as const;

// ============================================================
// Solana-Specific Constants
// ============================================================

/** Size of a token account in bytes for rent calculation */
export const TOKEN_ACCOUNT_SIZE = 165;

/** Program ID for the Memo program to add memos to transactions */
export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

// ============================================================
// Cache Configuration
// ============================================================

export const CACHE_CONFIG = {
  TTL: {
    ACCOUNT_INFO: 30000, // 30 seconds
    TOKEN_INFO: 300000, // 5 minutes
    MINT_INFO: 600000, // 10 minutes
    BALANCE: 30000, // 30 seconds
    TOKEN_DECIMALS: 600000 // 10 minutes
  },
  SIZE: {
    ACCOUNT_INFO: 100,
    TOKEN_INFO: 200,
    MINT_INFO: 500,
    BALANCE: 100,
    TOKEN_DECIMALS: 200
  },
  KEYS: {
    BALANCE: (address: string, assetType: string, tokenAddress?: string) =>
      `balance:${address}:${assetType}${tokenAddress ? `:${tokenAddress}` : ''}`,
    TOKEN_DECIMALS: (mintAddress: string) => `token-decimals:${mintAddress}`,
    ACCOUNT_INFO: (address: string) => `account-info:${address}`,
    TOKEN_INFO: (tokenAddress: string) => `token-info:${tokenAddress}`,
    MINT_INFO: (mintAddress: string) => `mint-info:${mintAddress}`
  }
} as const;

/** Maximum number of token decimals to cache */
export const MAX_DECIMALS_CACHE_SIZE = 100;

// ============================================================
// Retry Configuration
// ============================================================

/**
 * Default retry configuration for network operations.
 * Uses exponential backoff with randomization to avoid thundering herd.
 */
export const DEFAULT_RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000, // 1 second
  maxTimeout: 5000, // 5 seconds
  factor: 2,
  randomize: true
};

// ============================================================
// Error Handling Configuration
// ============================================================

/**
 * Solana RPC error codes that indicate network or infrastructure issues.
 * These errors should trigger retries in most cases.
 */
export const SOLANA_RPC_ERROR_CODES = {
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32002,
  RATE_LIMIT: -32005
} as const;

/**
 * Error message patterns that indicate Solana-specific network issues.
 * Used for error classification and retry logic.
 */
export const RETRY_ERROR_PATTERNS = ['rpc', 'solana', 'blockhash', 'commitment'] as const;

/**
 * Solana-specific retry decorator with chain-specific error patterns
 */
export const SolanaRetry = createChainRetry('Solana', RETRY_ERROR_PATTERNS, DEFAULT_RETRY_CONFIG);

// ============================================================
// Confirmation Strategy Configuration
// ============================================================

/**
 * Confirmation strategy options
 */
export interface ConfirmationStrategyConfig {
  /** Use WebSocket for real-time updates (default: true) */
  useWebSocket?: boolean;

  /** Fall back to polling if WebSocket fails (default: true) */
  fallbackToPolling?: boolean;

  /** Custom commitment level mapping */
  customCommitmentMapping?: {
    processed?: number;
    confirmed?: number;
    finalized?: number;
  };

  /** Batch size for querying multiple signatures (default: 100) */
  batchSize?: number;

  /** Enable intelligent polling intervals (default: true) */
  intelligentPolling?: boolean;

  /** WebSocket-specific configuration */
  webSocketConfig?: {
    maxReconnectAttempts?: number;
    reconnectDelayMs?: number;
    subscriptionTimeoutMs?: number;
  };
}

/**
 * Default confirmation strategy configuration
 */
export const DEFAULT_CONFIRMATION_STRATEGY: Required<ConfirmationStrategyConfig> = {
  useWebSocket: true,
  fallbackToPolling: true,
  customCommitmentMapping: {
    processed: 1,
    confirmed: 3,
    finalized: 10
  },
  batchSize: 100,
  intelligentPolling: true,
  webSocketConfig: {
    maxReconnectAttempts: 5,
    reconnectDelayMs: 1000,
    subscriptionTimeoutMs: 120000
  }
};
