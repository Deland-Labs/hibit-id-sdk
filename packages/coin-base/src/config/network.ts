/**
 * Default network configuration for all chains.
 * Individual chains can override these values as needed.
 */
export const DEFAULT_NETWORK_CONFIG = {
  /**
   * Retry configuration for network operations
   */
  RETRY: {
    /** Maximum number of retry attempts */
    MAX_ATTEMPTS: 3,
    /** Initial delay between retries in milliseconds */
    INITIAL_DELAY_MS: 1000,
    /** Maximum delay between retries in milliseconds */
    MAX_DELAY_MS: 5000,
    /** Multiplier for exponential backoff */
    BACKOFF_FACTOR: 2,
    /** Whether to add random jitter to retry delays */
    RANDOMIZE: true
  },

  /**
   * Cache configuration
   */
  CACHE: {
    /** Time to live for various cache types (in milliseconds) */
    TTL: {
      /** Fee cache TTL - 5 minutes */
      FEE: 5 * 60 * 1000,
      /** Decimals cache TTL - 1 hour */
      DECIMALS: 60 * 60 * 1000,
      /** Balance cache TTL - 10 seconds (if used) */
      BALANCE: 10 * 1000,
      /** Token metadata cache TTL - 24 hours */
      METADATA: 24 * 60 * 60 * 1000,
      /** Other generic cache TTL - 30 minutes */
      DEFAULT: 30 * 60 * 1000
    },
    /** Maximum number of items in cache */
    SIZE: {
      /** Fee cache size */
      FEE: 100,
      /** Decimals cache size */
      DECIMALS: 100,
      /** Balance cache size */
      BALANCE: 200,
      /** Metadata cache size */
      METADATA: 50,
      /** Default cache size */
      DEFAULT: 100
    }
  },

  /**
   * Request timeout configuration (in milliseconds)
   */
  TIMEOUT: {
    /** Default request timeout - 30 seconds */
    DEFAULT: 30 * 1000,
    /** Transaction broadcast timeout - 60 seconds */
    TRANSACTION: 60 * 1000,
    /** Balance query timeout - 15 seconds */
    BALANCE_QUERY: 15 * 1000
  },

  /**
   * Common network error patterns that should trigger retry
   */
  NETWORK_ERROR_PATTERNS: [
    'network',
    'timeout',
    'connection',
    'fetch failed',
    'request failed',
    'connect failed',
    'econnreset',
    'etimedout',
    'socket hang up'
  ] as const
} as const;

/**
 * Type for the default network configuration
 */
export type NetworkConfig = typeof DEFAULT_NETWORK_CONFIG;

/**
 * Deep partial type for configuration overrides
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Merge configurations deeply
 */
export function mergeNetworkConfig(custom?: DeepPartial<NetworkConfig>): NetworkConfig {
  if (!custom) return DEFAULT_NETWORK_CONFIG;

  return {
    RETRY: {
      ...DEFAULT_NETWORK_CONFIG.RETRY,
      ...(custom.RETRY || {})
    },
    CACHE: {
      TTL: {
        ...DEFAULT_NETWORK_CONFIG.CACHE.TTL,
        ...(custom.CACHE?.TTL || {})
      },
      SIZE: {
        ...DEFAULT_NETWORK_CONFIG.CACHE.SIZE,
        ...(custom.CACHE?.SIZE || {})
      }
    },
    TIMEOUT: {
      ...DEFAULT_NETWORK_CONFIG.TIMEOUT,
      ...(custom.TIMEOUT || {})
    },
    NETWORK_ERROR_PATTERNS: DEFAULT_NETWORK_CONFIG.NETWORK_ERROR_PATTERNS
  };
}
