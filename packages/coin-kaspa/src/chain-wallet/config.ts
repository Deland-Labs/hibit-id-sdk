import { kaspaToSompi } from '@kcoin/kaspa-web3.js';
import { ChainType } from '@delandlabs/hibit-basic-types';
import { createChainRetry } from '@delandlabs/coin-base';

/**
 * HD wallet derivation path for Kaspa blockchain
 * Follows BIP44 standard with Kaspa's coin type 111111
 */
export const DERIVING_PATH = "m/44'/111111'/0'/0/0";

/**
 * Chain type identifier for Kaspa blockchain
 */
export const CHAIN = ChainType.Kaspa;

/**
 * Human-readable chain name for error messages and logging
 */
export const CHAIN_NAME = 'Kaspa';

/**
 * Kaspa blockchain configuration constants
 *
 * This configuration object contains all the constants needed for Kaspa blockchain operations.
 * Values are defined as constants to ensure consistency across the wallet implementation.
 */
export const KASPA_CONFIG = {
  /**
   * Amount of KAS required for KRC20 token inscriptions
   * This is the minimum amount needed to create KRC20 transfer inscriptions
   * @type {bigint} Amount in sompi (1 KAS = 10^8 sompi)
   */
  AMOUNT_FOR_INSCRIBE: kaspaToSompi('0.3'),

  /**
   * Interval for sending ping messages to maintain RPC connection
   * @type {number} Interval in milliseconds
   */
  PING_INTERVAL_MS: 10000,

  /**
   * Cache key identifier for native KAS balance entries
   * @type {string} String identifier used in balance cache
   */
  CACHE_KEY_NATIVE: 'native'
} as const;

/**
 * Retry configuration for network operations
 *
 * This configuration is used by the executeWithRetry utility to handle
 * transient network failures with exponential backoff.
 */
export const DEFAULT_RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000, // ms
  maxTimeout: 5000, // ms
  factor: 2,
  randomize: true
};

/**
 * Error message patterns that indicate network-related issues
 *
 * These patterns are used to identify errors that should trigger retry logic
 * in network operations. The patterns are matched case-insensitively against
 * error messages to determine if a retry should be attempted.
 */
export const KASPA_NETWORK_ERROR_PATTERNS = [
  'network',
  'timeout',
  'connection',
  'fetch failed',
  'request failed',
  'connect failed',
  'kaspa',
  'rpc'
] as const;

/**
 * Kaspa-specific retry decorator with configured error patterns and timeouts
 * Uses Kaspa-specific error patterns and default retry configuration
 */
export const KaspaRetry = createChainRetry('Kaspa', KASPA_NETWORK_ERROR_PATTERNS, DEFAULT_RETRY_CONFIG);
