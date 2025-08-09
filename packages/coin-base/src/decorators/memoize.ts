import { ILogger, NoOpLogger } from '../utils/logger';
import { Cacheable, CacheableOptions } from './cacheable';
import { DEFAULT_NETWORK_CONFIG } from '../config/network';

/**
 * Map to store pending promises for deduplication
 */
const pendingPromises = new Map<string, Map<string, Promise<any>>>();

/**
 * Memoize decorator with automatic deduplication of concurrent calls
 *
 * This decorator extends @Cacheable with:
 * - Automatic deduplication of concurrent identical calls
 * - Promise-based caching
 * - Error handling
 *
 * If the decorated class has a 'logger' property, it will be used automatically for logging.
 *
 * Usage:
 * ```typescript
 * class TokenService {
 *   private logger: ILogger; // Will be used automatically by @Memoize
 *
 *   @Memoize({ ttl: 60000 })
 *   async getDecimals(tokenId: string): Promise<number> {
 *     return await fetchDecimalsFromChain(tokenId);
 *   }
 * }
 * ```
 */
export function Memoize(options: CacheableOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const className = target.constructor.name;
    const methodId = `${className}.${propertyKey}`;

    // First apply the Cacheable decorator
    Cacheable(options)(target, propertyKey, descriptor);
    const cacheableMethod = descriptor.value;

    // Then wrap with deduplication logic
    descriptor.value = async function (this: any, ...args: any[]) {
      const logger = options.logger ? options.logger.call(this) : new NoOpLogger();
      // Generate cache key
      const cacheKey = options.key ? options.key.call(this, ...args) : args.map((arg) => JSON.stringify(arg)).join(':');

      // Get or create pending promises map for this method
      if (!pendingPromises.has(methodId)) {
        pendingPromises.set(methodId, new Map());
      }
      const methodPromises = pendingPromises.get(methodId)!;

      // Check if there's already a pending promise for this key
      const pendingPromise = methodPromises.get(cacheKey);
      if (pendingPromise) {
        logger.debug(`Deduplicating concurrent call: ${cacheKey}`, {
          context: `${methodId}.memoize`
        });
        return pendingPromise;
      }

      // Create new promise and store it
      const promise = (async () => {
        try {
          // Call the cacheable method (which checks cache first)
          return await cacheableMethod.apply(this, args);
        } finally {
          // Clean up pending promise
          methodPromises.delete(cacheKey);
          if (methodPromises.size === 0) {
            pendingPromises.delete(methodId);
          }
        }
      })();

      methodPromises.set(cacheKey, promise);
      return promise;
    };

    return descriptor;
  };
}

/**
 * Retry decorator with memoization
 *
 * Combines retry logic with caching for resilient data fetching
 *
 * Usage:
 * ```typescript
 * class ChainService {
 *   @RetryableMemoize({
 *     ttl: 60000,
 *     retries: 3,
 *     retryDelay: 1000
 *   })
 *   async fetchTokenMetadata(tokenId: string): Promise<Metadata> {
 *     return await rpcCall(tokenId);
 *   }
 * }
 * ```
 */
export interface RetryableMemoizeOptions extends CacheableOptions {
  /**
   * Number of retry attempts
   */
  retries?: number;

  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;

  /**
   * Exponential backoff factor
   */
  backoffFactor?: number;

  /**
   * Function to determine if error should trigger retry
   */
  shouldRetry?: (error: any) => boolean;
}

export function RetryableMemoize(options: RetryableMemoizeOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const {
      retries = DEFAULT_NETWORK_CONFIG.RETRY.MAX_ATTEMPTS,
      retryDelay = DEFAULT_NETWORK_CONFIG.RETRY.INITIAL_DELAY_MS,
      backoffFactor = DEFAULT_NETWORK_CONFIG.RETRY.BACKOFF_FACTOR,
      shouldRetry = (error) => {
        const message = error?.message?.toLowerCase() || '';
        return message.includes('network') || message.includes('timeout') || message.includes('connection');
      }
    } = options;

    // Wrap with retry logic
    descriptor.value = async function (this: any, ...args: any[]) {
      // Get logger at runtime
      const logger: ILogger =
        this.logger && typeof this.logger.debug === 'function'
          ? this.logger
          : typeof options.logger === 'function'
            ? options.logger.call(this)
            : options.logger || new NoOpLogger();
      let lastError: any;
      let delay = retryDelay;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          if (attempt === retries || !shouldRetry(error)) {
            throw error;
          }

          logger.warn(`Retry attempt ${attempt + 1}/${retries + 1} after ${delay}ms`, {
            context: `${target.constructor.name}.${propertyKey}`,
            data: { error: error instanceof Error ? error.message : String(error) }
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= backoffFactor;
        }
      }

      throw lastError;
    };

    // Then apply memoization
    Memoize(options)(target, propertyKey, descriptor);

    return descriptor;
  };
}
