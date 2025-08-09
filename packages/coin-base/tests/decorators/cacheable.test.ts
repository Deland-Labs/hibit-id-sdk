import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cacheable, CacheEvict, clearAllCaches, getCacheStats } from '../../src/decorators/cacheable';
import { LRUCache } from 'lru-cache';
import { ILogger } from '../../src/utils/logger';

describe('Cacheable decorator', () => {
  let mockLogger: ILogger;
  let callCount: number;

  beforeEach(() => {
    callCount = 0;
    clearAllCaches();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger)
    };
  });

  // Use a function to create the service class with the current mockLogger
  function createTestService() {
    class TestService {
      @Cacheable({ ttl: 1000, logger: () => mockLogger })
      async getData(id: string): Promise<string> {
        callCount++;
        return `data-${id}`;
      }

      @Cacheable({
        ttl: 1000,
        key: (a: number, b: number) => `sum:${a}:${b}`,
        logger: () => mockLogger
      })
      async sum(a: number, b: number): Promise<number> {
        callCount++;
        return a + b;
      }

      @Cacheable({
        ttl: 1000,
        condition: (result) => result !== null,
        logger: () => mockLogger
      })
      async getConditionalData(id: string): Promise<string | null> {
        callCount++;
        return id === 'null' ? null : `data-${id}`;
      }

      @Cacheable({ max: 2, logger: () => mockLogger })
      async getLimitedData(id: string): Promise<string> {
        callCount++;
        return `limited-${id}`;
      }
    }

    return new TestService();
  }

  describe('Basic caching', () => {
    it('should cache method results', async () => {
      const service = createTestService();

      const result1 = await service.getData('123');
      expect(result1).toBe('data-123');
      expect(callCount).toBe(1);

      // Check first call logged cache miss
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache miss'), expect.objectContaining({
        context: expect.any(String)
      }));

      // Reset mock to check second call
      vi.mocked(mockLogger.debug).mockClear();

      const result2 = await service.getData('123');
      expect(result2).toBe('data-123');
      expect(callCount).toBe(1); // Should not increment

      // Check second call logged cache hit
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache hit'), expect.objectContaining({
        context: expect.any(String)
      }));
    });

    it('should cache different arguments separately', async () => {
      const service = createTestService();

      await service.getData('123');
      expect(callCount).toBe(1);

      await service.getData('456');
      expect(callCount).toBe(2);

      await service.getData('123');
      expect(callCount).toBe(2); // Should use cache
    });
  });

  describe('Custom key generator', () => {
    it('should use custom key generator', async () => {
      const service = createTestService();

      const result1 = await service.sum(2, 3);
      expect(result1).toBe(5);
      expect(callCount).toBe(1);

      // Reset mock to check second call
      vi.mocked(mockLogger.debug).mockClear();

      const result2 = await service.sum(2, 3);
      expect(result2).toBe(5);
      expect(callCount).toBe(1); // Should use cache

      expect(mockLogger.debug).toHaveBeenCalledWith('Cache hit: sum:2:3', expect.objectContaining({
        context: expect.any(String)
      }));
    });
  });

  describe('Conditional caching', () => {
    it('should only cache results that meet condition', async () => {
      const service = createTestService();

      // This should be cached
      await service.getConditionalData('valid');
      expect(callCount).toBe(1);

      await service.getConditionalData('valid');
      expect(callCount).toBe(1); // Should use cache

      // This should NOT be cached
      await service.getConditionalData('null');
      expect(callCount).toBe(2);

      await service.getConditionalData('null');
      expect(callCount).toBe(3); // Should NOT use cache
    });
  });

  describe('TTL expiration', () => {
    it('should expire cache after TTL', async () => {
      const service = createTestService();

      await service.getData('123');
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await service.getData('123');
      expect(callCount).toBe(2); // Should fetch again
    });
  });

  describe('Max size limit', () => {
    it('should limit cache size', async () => {
      const service = createTestService();

      // Fill the cache to max (2 items)
      await service.getLimitedData('1');
      await service.getLimitedData('2');
      expect(callCount).toBe(2);

      // Add a third item - this should evict one of the previous items
      await service.getLimitedData('3');
      expect(callCount).toBe(3);

      // Try all three again
      await service.getLimitedData('1');
      await service.getLimitedData('2');
      await service.getLimitedData('3');

      // At least one should have been evicted (cache max is 2)
      const totalCalls = callCount;
      expect(totalCalls).toBeGreaterThan(3); // At least one was evicted and refetched
      expect(totalCalls).toBeLessThanOrEqual(6); // At most all 3 were evicted
    });
  });

  describe('Custom cache instance', () => {
    it('should use provided cache instance', async () => {
      const customCache = new LRUCache<string, any>({ max: 100, ttl: 5000 });

      class CustomCacheService {
        @Cacheable({ cache: customCache, logger: () => mockLogger })
        async getData(id: string): Promise<string> {
          callCount++;
          return `custom-${id}`;
        }
      }

      const service = new CustomCacheService();

      await service.getData('123');
      expect(callCount).toBe(1);

      await service.getData('123');
      expect(callCount).toBe(1);

      // Verify it's using the custom cache
      expect(customCache.has('getData:123')).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should not cache errors', async () => {
      class ErrorService {
        private attempts = 0;

        @Cacheable({ logger: () => mockLogger })
        async getData(): Promise<string> {
          callCount++;
          this.attempts++;
          if (this.attempts === 1) {
            throw new Error('First attempt fails');
          }
          return 'success';
        }
      }

      const service = new ErrorService();

      await expect(service.getData()).rejects.toThrow('First attempt fails');
      expect(callCount).toBe(1);

      // Second call should not use cache
      const result = await service.getData();
      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });
  });

  describe('Cache statistics', () => {
    it('should provide cache statistics', async () => {
      const service = createTestService();

      await service.getData('1');
      await service.getData('2');

      const stats = getCacheStats('TestService.getData');
      expect(stats).toBeDefined();
      expect(stats?.size).toBe(2);
      expect(stats?.maxSize).toBe(100); // Default max
    });

    it('should return undefined for non-existent cache', () => {
      const stats = getCacheStats('NonExistent.method');
      expect(stats).toBeUndefined();
    });
  });
});

describe('CacheEvict decorator', () => {
  let mockLogger: ILogger;
  let callCount: number;
  let updateCount: number;

  beforeEach(() => {
    callCount = 0;
    updateCount = 0;
    clearAllCaches();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger)
    };
  });

  function createDataService() {
    class DataService {
      @Cacheable({ logger: () => mockLogger })
      async getData(id: string): Promise<string> {
        callCount++;
        return `data-${id}`;
      }

      @CacheEvict({
        key: (id: string) => `getData:${id}`,
        cacheId: 'DataService.getData',
        logger: () => mockLogger
      })
      async updateData(_id: string, _value: string): Promise<void> {
        updateCount++;
        // Simulate update
      }

      @CacheEvict({
        key: () => ['getData:1', 'getData:2', 'getData:3'],
        cacheId: 'DataService.getData',
        logger: () => mockLogger
      })
      async clearMultiple(): Promise<void> {
        updateCount++;
      }
    }

    return new DataService();
  }

  it('should evict cache entry after update', async () => {
    const service = createDataService();

    // Cache the data
    await service.getData('123');
    expect(callCount).toBe(1);

    // Verify it's cached
    await service.getData('123');
    expect(callCount).toBe(1);

    // Update should evict cache
    await service.updateData('123', 'new-value');
    expect(updateCount).toBe(1);

    // Next call should fetch again
    await service.getData('123');
    expect(callCount).toBe(2);

    expect(mockLogger.debug).toHaveBeenCalledWith('Evicted cache key: getData:123', expect.objectContaining({
      context: expect.any(String)
    }));
  });

  it('should evict multiple cache entries', async () => {
    const service = createDataService();

    // Cache multiple entries
    await service.getData('1');
    await service.getData('2');
    await service.getData('3');
    expect(callCount).toBe(3);

    // Verify they're cached
    await service.getData('1');
    await service.getData('2');
    await service.getData('3');
    expect(callCount).toBe(3);

    // Clear multiple
    await service.clearMultiple();

    // All should be evicted
    await service.getData('1');
    await service.getData('2');
    await service.getData('3');
    expect(callCount).toBe(6);
  });

  it('should warn when cache not found', async () => {
    class OrphanService {
      @CacheEvict({
        key: () => 'some-key',
        logger: () => mockLogger
      })
      async evictNonExistent(): Promise<void> {
        // No matching @Cacheable method
      }
    }

    const service = new OrphanService();
    await service.evictNonExistent();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No cache found for eviction'),
      expect.objectContaining({
        context: expect.any(String)
      })
    );
  });

  it('should work with custom cache instance', async () => {
    const customCache = new LRUCache<string, any>({ max: 100 });

    class CustomService {
      @Cacheable({ cache: customCache })
      async getData(id: string): Promise<string> {
        callCount++;
        return `data-${id}`;
      }

      @CacheEvict({
        key: (id: string) => `getData:${id}`,
        cache: customCache
      })
      async updateData(_id: string): Promise<void> {
        updateCount++;
      }
    }

    const service = new CustomService();

    await service.getData('123');
    expect(callCount).toBe(1);
    expect(customCache.has('getData:123')).toBe(true);

    await service.updateData('123');
    expect(customCache.has('getData:123')).toBe(false);
  });
});

describe('clearAllCaches', () => {
  it('should clear all cache instances', async () => {
    class Service1 {
      @Cacheable()
      async getData(id: string): Promise<string> {
        return `service1-${id}`;
      }
    }

    class Service2 {
      @Cacheable()
      async getData(id: string): Promise<string> {
        return `service2-${id}`;
      }
    }

    const service1 = new Service1();
    const service2 = new Service2();

    // Cache some data
    await service1.getData('123');
    await service2.getData('456');

    // Clear all caches
    clearAllCaches();

    // Stats should be undefined after clearing
    expect(getCacheStats('Service1.getData')).toBeUndefined();
    expect(getCacheStats('Service2.getData')).toBeUndefined();
  });
});
