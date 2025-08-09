import { ChainType } from '@delandlabs/hibit-basic-types';
import { DEFAULT_NETWORK_CONFIG, mergeNetworkConfig } from '@delandlabs/coin-base';
import { createChainRetry } from '@delandlabs/coin-base';

/**
 * Unified configuration for Ethereum blockchain integration.
 *
 * This file consolidates all configuration constants, replacing the
 * previous separate defaults.ts and constants.ts files for better
 * maintainability and reduced conceptual overlap.
 */

// ============================================================
// Chain Configuration (replaces basic chain info from defaults.ts)
// ============================================================
export const CHAIN_CONFIG = {
  CHAIN: ChainType.Ethereum,
  CHAIN_NAME: 'Ethereum',
  DERIVING_PATH: "m/44'/60'/0'/0/0"
} as const;

// ============================================================
// Network Configuration
// ============================================================
export const NETWORK_CONFIG = mergeNetworkConfig({
  // Ethereum uses default retry configuration from coin-base
  // Additional Ethereum-specific network configs:
});

// Ethereum-specific network constants
export const ETHEREUM_NETWORK = {
  // Ethereum RPC error patterns that indicate network issues
  ERROR_PATTERNS: [
    'network',
    'timeout',
    'connection',
    'fetch failed',
    'request failed',
    'connect failed',
    'websocket',
    'rpc',
    'provider'
  ] as const,

  // WebSocket configuration
  WEBSOCKET: {
    maxReconnectAttempts: 5,
    initialReconnectDelay: 1000, // 1 second
    pingInterval: 60000 // 60 seconds
  }
} as const;

// ============================================================
// Cache Configuration
// ============================================================
export const CACHE_CONFIG = {
  // Use default cache sizes and TTLs from coin-base
  ...DEFAULT_NETWORK_CONFIG.CACHE,

  // Ethereum-specific cache configurations
  SIZE: {
    ...DEFAULT_NETWORK_CONFIG.CACHE.SIZE,
    PROVIDER: 10,
    GAS_PRICE: 10,
    DECIMALS: 100 // Token decimals rarely change
  },
  TTL: {
    ...DEFAULT_NETWORK_CONFIG.CACHE.TTL,
    GAS_PRICE: 10 * 1000, // 10 seconds
    DECIMALS: 24 * 60 * 60 * 1000 // 24 hours - decimals rarely change
  }
} as const;

// ============================================================
// Protocol Constants
// ============================================================
export const PROTOCOL_CONFIG = {
  // EIP-1559 support detection
  EIP_1559_ENABLED: true,

  // Default gas limits
  DEFAULT_GAS_LIMITS: {
    NATIVE_TRANSFER: 21000n,
    ERC20_TRANSFER: 65000n
  }
} as const;

// ============================================================
// Error Messages
// ============================================================
export const ERROR_MESSAGES = {
  INVALID_CHAIN: `${CHAIN_CONFIG.CHAIN_NAME}: Invalid chain type`,
  INVALID_ADDRESS: `${CHAIN_CONFIG.CHAIN_NAME}: Invalid address format`,
  INVALID_TOKEN: `${CHAIN_CONFIG.CHAIN_NAME}: Invalid ERC20 contract address`,
  NETWORK_ERROR: `${CHAIN_CONFIG.CHAIN_NAME}: Network error`,
  TRANSFER_FAILED: `${CHAIN_CONFIG.CHAIN_NAME}: Transfer failed`,
  FEE_ESTIMATION_FAILED: `${CHAIN_CONFIG.CHAIN_NAME}: Fee estimation failed`,
  MESSAGE_SIGNING_FAILED: `${CHAIN_CONFIG.CHAIN_NAME}: Message signing failed`,
  NOT_INITIALIZED: 'Wallet not initialized. Call initialize() first.'
} as const;

// ============================================================
// Pre-configured Retry Decorator for Ethereum
// Fixed to use immediate initialization to avoid decorator execution timing issues
// ============================================================
export const EthereumRetry = createChainRetry(CHAIN_CONFIG.CHAIN_NAME, ETHEREUM_NETWORK.ERROR_PATTERNS);
