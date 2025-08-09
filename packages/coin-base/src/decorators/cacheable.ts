import { LRUCache } from 'lru-cache';
import { ILogger, NoOpLogger } from '../utils/logger';

/**
 * Cache configuration options for the @Cacheable decorator
 */
export interface CacheableOptions {
  /**
   * Cache key generator function
   * @param args - Method arguments
   * @returns Cache key string
   */
  key?: (...args: any[]) => string;

  /**
   * Time to live in milliseconds
   */
  ttl?: number;

  /**
   * Maximum number of items in cache
   */
  max?: number;

  /**
   * Condition function to determine if result should be cached
   * @param result - Method result
   * @returns True if result should be cached
   */
  condition?: (result: any) => boolean;

  /**
   * Custom cache instance to use (optional)
   */
  cache?: LRUCache<string, any>;

  /**
   * Function to get logger instance
   * If not provided, uses NoOpLogger
   */
  logger?: () => ILogger;
}

/**
 * Global cache registry to manage cache instances
 */
const cacheRegistry = new Map<string, LRUCache<string, any>>();

/**
 * Get or create a cache instance
 */
function getOrCreateCache(cacheId: string, options: { max?: number; ttl?: number }): LRUCache<string, any> {
  if (!cacheRegistry.has(cacheId)) {
    cacheRegistry.set(
      cacheId,
      new LRUCache({
        max: options.max || 100,
        ttl: options.ttl
      })
    );
  }
  return cacheRegistry.get(cacheId)!;
}

/**
 * Default key generator using method name and arguments
 */
function defaultKeyGenerator(methodName: string, ...args: any[]): string {
  const argsKey = args
    .map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        // For objects, use JSON stringify with sorted keys for consistency
        return JSON.stringify(arg, Object.keys(arg).sort());
      }
      return String(arg);
    })
    .join(':');

  return `${methodName}:${argsKey}`;
}

/**
 * Cacheable decorator for methods
 *
 * Automatically caches method results with LRU eviction and TTL support.
 * If the decorated class has a 'logger' property, it will be used automatically for logging.
 *
 * Usage:
 * ```typescript
 * class MyService {
 *   private logger: ILogger; // Will be used automatically by @Cacheable
 *
 *   @Cacheable({ ttl: 60000 })
 *   async getData(id: string): Promise<Data> {
 *     return await fetchData(id);
 *   }
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Handle both legacy and modern decorator behavior
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error(`@Cacheable can only be applied to methods`);
    }

    const originalMethod = descriptor.value;
    const className = target.constructor?.name || 'UnknownClass';
    const cacheId = `${className}.${propertyKey}`;

    descriptor.value = async function (this: any, ...args: any[]) {
      const logger = options.logger ? options.logger.call(this) : new NoOpLogger();
      // Get or create a cache instance
      const cache =
        options.cache ||
        getOrCreateCache(cacheId, {
          max: options.max,
          ttl: options.ttl
        });

      // Generate cache key
      const cacheKey = options.key ? options.key.call(this, ...args) : defaultKeyGenerator(propertyKey, ...args);

      // Check cache
      const cached = cache.get(cacheKey);
      if (cached !== undefined) {
        logger.debug(`Cache hit: ${cacheKey}`, {
          context: `${cacheId}.cacheable`
        });
        return cached;
      }

      // Execute original method
      logger.debug(`Cache miss: ${cacheKey}`, {
        context: `${cacheId}.cacheable`
      });
      const result = await originalMethod.apply(this, args);

      // Check condition before caching
      if (!options.condition || options.condition(result)) {
        cache.set(cacheKey, result);
        logger.debug(`Cached result: ${cacheKey}`, {
          context: `${cacheId}.cacheable`
        });
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache eviction decorator
 *
 * Evicts cache entries after method execution.
 * If the decorated class has a 'logger' property, it will be used automatically for logging.
 *
 * Usage:
 * ```typescript
 * class MyService {
 *   private logger: ILogger; // Will be used automatically by @CacheEvict
 *
 *   @CacheEvict({ key: (id) => `getData:${id}` })
 *   async updateData(id: string, data: Data): Promise<void> {
 *     await saveData(id, data);
 *   }
 * }
 * ```
 */
export function CacheEvict(options: {
  key: (...args: any[]) => string | string[];
  cache?: LRUCache<string, any>;
  cacheId?: string;
  logger?: () => ILogger;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (this: any, ...args: any[]) {
      const logger = options.logger ? options.logger.call(this) : new NoOpLogger();
      // Execute original method first
      const result = await originalMethod.apply(this, args);

      // Get cache instance
      const cacheId = options.cacheId || `${className}.getData`; // Default to getData
      const cache = options.cache || cacheRegistry.get(cacheId);
      if (!cache) {
        logger.warn(`No cache found for eviction: ${cacheId}`, {
          context: `${className}.${propertyKey}.cacheEvict`
        });
        return result;
      }

      // Generate keys to evict
      const keysToEvict = options.key(...args);
      const keys = Array.isArray(keysToEvict) ? keysToEvict : [keysToEvict];

      // Evict keys
      keys.forEach((key) => {
        cache.delete(key);
        logger.debug(`Evicted cache key: ${key}`, {
          context: `${className}.${propertyKey}.cacheEvict`
        });
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  cacheRegistry.forEach((cache) => cache.clear());
  cacheRegistry.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(cacheId: string):
  | {
      size: number;
      maxSize: number;
      hitRate?: number;
    }
  | undefined {
  const cache = cacheRegistry.get(cacheId);
  if (!cache) return undefined;

  return {
    size: cache.size,
    maxSize: cache.max
    // LRUCache doesn't track hit rate by default, but we could extend it
  };
}
