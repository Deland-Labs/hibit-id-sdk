import { ChainType } from '@delandlabs/hibit-basic-types';
import { DEFAULT_NETWORK_CONFIG, mergeNetworkConfig } from '@delandlabs/coin-base';

/**
 * Dfinity chain wallet configuration.
 *
 * This file contains all configuration constants, defaults, and protocol
 * specifications used throughout the Dfinity chain wallet implementation.
 */

/**
 * Basic chain configuration.
 *
 * These are the fundamental settings that identify and configure
 * the chain wallet behavior.
 */
export const CHAIN_CONFIG = {
  /** Chain type identifier */
  CHAIN: ChainType.Dfinity,
  /** Human-readable chain name */
  CHAIN_NAME: 'ICP',
  /** HD wallet derivation path for ICP (BIP-44) */
  DERIVING_PATH: "m/44'/223'/0'/0'/0'"
} as const;

/**
 * Internet Computer protocol constants.
 *
 * These constants are based on the IC specification and are used throughout
 * the wallet implementation for validation and address handling.
 *
 * @see https://internetcomputer.org/docs/current/references/ic-interface-spec
 */
export const IC_PROTOCOL = {
  /**
   * User principal constants based on IC specification.
   */
  USER_PRINCIPAL: {
    /** Hash length for user principals (28 bytes) */
    HASH_LENGTH: 28,
    /** Self-authenticating type byte */
    TYPE_SELF_AUTH: 0x02,
    /** Total length of user principal (28 hash + 1 type = 29 bytes) */
    TOTAL_LENGTH: 29
  },
  /**
   * Canister ID constants.
   */
  CANISTER_ID: {
    /** Canister ID length in bytes */
    LENGTH: 10
  },
  /**
   * Address format constants.
   */
  ADDRESS_FORMAT: {
    /** AccountIdentifier hex string length */
    ACCOUNT_IDENTIFIER_HEX_LENGTH: 64
  }
} as const;

/**
 * Well-known canister IDs for core Internet Computer services.
 */
export const IC_CANISTERS = {
  /** ICP Ledger Canister ID - manages native ICP token operations */
  ICP_LEDGER: 'ryjl3-tyaaa-aaaaa-aaaba-cai'
} as const;

/**
 * Cache configuration for Dfinity.
 *
 * Extends the default cache configuration with Dfinity-specific settings.
 */
export const CACHE_CONFIG = {
  /** Maximum number of entries in each cache */
  SIZE: {
    ...DEFAULT_NETWORK_CONFIG.CACHE.SIZE,
    // Dfinity-specific cache sizes
    ICRC3_SUPPORT: 500,
    LEDGER: 100
  },
  /** Time To Live in milliseconds for each cache type */
  TTL: {
    ...DEFAULT_NETWORK_CONFIG.CACHE.TTL,
    // Dfinity-specific TTLs
    ICRC3_SUPPORT: 30 * 60 * 1000, // 30 minutes
    LEDGER: 60 * 60 * 1000 // 1 hour
  }
} as const;

/**
 * Network configuration for Dfinity.
 *
 * Uses default configuration from coin-base.
 * Override specific values here if needed.
 */
export const NETWORK_CONFIG = mergeNetworkConfig({
  // Dfinity uses default retry configuration
  // Add overrides here if needed:
  // RETRY: {
  //   MAX_ATTEMPTS: 5
  // }
});

/**
 * Chain-specific retry decorator for Dfinity operations.
 * Pre-configured with ICP-specific error patterns.
 */
import { createChainRetry } from '@delandlabs/coin-base';

export const DfinityRetry = createChainRetry(
  CHAIN_CONFIG.CHAIN_NAME,
  ['canister', 'replica', 'ic0', 'ic://', 'agent-js', 'certificate', 'consensus'],
  {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 5000
  }
);
