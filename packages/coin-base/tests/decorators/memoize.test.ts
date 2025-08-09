import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Memoize, RetryableMemoize } from '../../src/decorators/memoize';
import { clearAllCaches } from '../../src/decorators/cacheable';
import { ILogger } from '../../src/utils/logger';

describe('Memoize decorator', () => {
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

  function createTestService() {
    class TestService {
      @Memoize({ ttl: 1000, logger: () => mockLogger })
      async fetchData(id: string): Promise<string> {
        callCount++;
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 100));
        return `data-${id}`;
      }

      @Memoize({
        key: (a: number, b: number) => `multiply:${a}:${b}`,
        logger: () => mockLogger
      })
      async multiply(a: number, b: number): Promise<number> {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return a * b;
      }
    }

    return new TestService();
  }

  describe('Basic memoization', () => {
    it('should cache results like Cacheable', async () => {
      const service = createTestService();

      const result1 = await service.fetchData('123');
      expect(result1).toBe('data-123');
      expect(callCount).toBe(1);

      const result2 = await service.fetchData('123');
      expect(result2).toBe('data-123');
      expect(callCount).toBe(1); // Should use cache
    });
  });

  describe('Concurrent call deduplication', () => {
    it('should deduplicate concurrent identical calls', async () => {
      const service = createTestService();

      // Make multiple concurrent calls
      const promises = [
        service.fetchData('123'),
        service.fetchData('123'),
        service.fetchData('123'),
        service.fetchData('123')
      ];

      const results = await Promise.all(promises);

      // All should return the same result
      results.forEach((result) => {
        expect(result).toBe('data-123');
      });

      // But the method should only be called once
      expect(callCount).toBe(1);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Deduplicating concurrent call'),
        expect.objectContaining({
          context: expect.any(String)
        })
      );
    });

    it('should not deduplicate calls with different arguments', async () => {
      const service = createTestService();

      const promises = [service.fetchData('123'), service.fetchData('456'), service.fetchData('789')];

      await Promise.all(promises);

      expect(callCount).toBe(3);
    });

    it('should handle mixed concurrent and sequential calls', async () => {
      const service = createTestService();

      // First concurrent batch
      const batch1 = [service.fetchData('123'), service.fetchData('123')];

      await Promise.all(batch1);
      expect(callCount).toBe(1);

      // Sequential call (should use cache)
      await service.fetchData('123');
      expect(callCount).toBe(1);

      // Second concurrent batch with new value
      const batch2 = [service.fetchData('456'), service.fetchData('456')];

      await Promise.all(batch2);
      expect(callCount).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should not cache or deduplicate failed calls', async () => {
      class ErrorService {
        private attempts = 0;

        @Memoize({ logger: () => mockLogger })
        async fetchData(): Promise<string> {
          callCount++;
          this.attempts++;

          await new Promise((resolve) => setTimeout(resolve, 50));

          if (this.attempts <= 2) {
            throw new Error(`Attempt ${this.attempts} failed`);
          }
          return 'success';
        }
      }

      const service = new ErrorService();

      // First call fails
      await expect(service.fetchData()).rejects.toThrow('Attempt 1 failed');
      expect(callCount).toBe(1);

      // Concurrent calls during failure
      const promises = [service.fetchData().catch((e) => e.message), service.fetchData().catch((e) => e.message)];

      const results = await Promise.all(promises);

      // Both should fail with the same error (deduplicated)
      expect(results[0]).toBe('Attempt 2 failed');
      expect(results[1]).toBe('Attempt 2 failed');
      expect(callCount).toBe(2); // Only one additional call

      // Next call should succeed
      const success = await service.fetchData();
      expect(success).toBe('success');
      expect(callCount).toBe(3);

      // Subsequent calls should use cache
      const cached = await service.fetchData();
      expect(cached).toBe('success');
      expect(callCount).toBe(3);
    });
  });

  describe('Custom key generation', () => {
    it('should use custom key for deduplication', async () => {
      const service = createTestService();

      const promises = [service.multiply(3, 4), service.multiply(3, 4), service.multiply(3, 4)];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBe(12);
      });

      expect(callCount).toBe(1);
    });
  });

  describe('Promise cleanup', () => {
    it('should clean up pending promises after completion', async () => {
      const service = createTestService();

      // Make concurrent calls
      await Promise.all([service.fetchData('123'), service.fetchData('123')]);

      // Make another set of concurrent calls
      // These should create new pending promises
      let secondCallCount = callCount;
      await Promise.all([service.fetchData('456'), service.fetchData('456')]);

      // Should have made exactly one more call
      expect(callCount).toBe(secondCallCount + 1);
    });
  });
});

describe('RetryableMemoize decorator', () => {
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

  describe('Retry with memoization', () => {
    it('should retry on failure and cache on success', async () => {
      class RetryService {
        private attempts = 0;

        @RetryableMemoize({
          retries: 3,
          retryDelay: 10,
          logger: () => mockLogger
        })
        async fetchData(id: string): Promise<string> {
          callCount++;
          this.attempts++;

          if (this.attempts < 3) {
            throw new Error('Network error');
          }

          return `data-${id}`;
        }
      }

      const service = new RetryService();

      const result = await service.fetchData('123');
      expect(result).toBe('data-123');
      expect(callCount).toBe(3); // Initial + 2 retries

      // Subsequent calls should use cache
      const cached = await service.fetchData('123');
      expect(cached).toBe('data-123');
      expect(callCount).toBe(3); // No additional calls

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt'),
        expect.objectContaining({
          context: expect.any(String),
          data: expect.any(Object)
        })
      );
    });

    it('should throw after max retries', async () => {
      class FailingService {
        @RetryableMemoize({
          retries: 2,
          retryDelay: 10,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          callCount++;
          throw new Error('Network error');
        }
      }

      const service = new FailingService();

      await expect(service.fetchData()).rejects.toThrow('Network error');
      expect(callCount).toBe(3); // Initial + 2 retries
    });

    it('should deduplicate concurrent retry attempts', async () => {
      class RetryService {
        private attempts = 0;

        @RetryableMemoize({
          retries: 3,
          retryDelay: 10,
          logger: () => mockLogger
        })
        async fetchData(id: string): Promise<string> {
          callCount++;
          this.attempts++;

          await new Promise((resolve) => setTimeout(resolve, 20));

          if (this.attempts < 2) {
            throw new Error('Network error');
          }

          return `data-${id}`;
        }
      }

      const service = new RetryService();

      // Make concurrent calls
      const promises = [service.fetchData('123'), service.fetchData('123'), service.fetchData('123')];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBe('data-123');
      });

      // Should only retry once for all concurrent calls
      expect(callCount).toBe(2); // Initial + 1 retry
    });
  });

  describe('Custom retry conditions', () => {
    it('should only retry for matching errors', async () => {
      class SelectiveRetryService {
        private attempts = 0;

        @RetryableMemoize({
          retries: 3,
          retryDelay: 10,
          shouldRetry: (error) => error.message.includes('timeout'),
          logger: () => mockLogger
        })
        async fetchData(shouldTimeout: boolean): Promise<string> {
          callCount++;
          this.attempts++;

          if (this.attempts === 1) {
            throw new Error(shouldTimeout ? 'Request timeout' : 'Invalid input');
          }

          return 'success';
        }
      }

      const service = new SelectiveRetryService();

      // This should retry
      const result1 = await service.fetchData(true);
      expect(result1).toBe('success');
      expect(callCount).toBe(2); // Initial + 1 retry

      // Reset
      service['attempts'] = 0;
      const previousCount = callCount;

      // This should NOT retry
      await expect(service.fetchData(false)).rejects.toThrow('Invalid input');
      expect(callCount).toBe(previousCount + 1); // No retry
    });
  });

  describe('Exponential backoff', () => {
    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Mock setTimeout to capture delays
      global.setTimeout = ((fn: Function, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0); // Execute immediately
      }) as any;

      class BackoffService {
        private attempts = 0;

        @RetryableMemoize({
          retries: 3,
          retryDelay: 100,
          backoffFactor: 2,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          this.attempts++;

          if (this.attempts <= 3) {
            throw new Error('Network error');
          }

          return 'success';
        }
      }

      const service = new BackoffService();

      try {
        await service.fetchData();
      } finally {
        global.setTimeout = originalSetTimeout;
      }

      // Check exponential backoff delays
      expect(delays[0]).toBe(100); // First retry: 100ms
      expect(delays[1]).toBe(200); // Second retry: 100 * 2 = 200ms
      expect(delays[2]).toBe(400); // Third retry: 200 * 2 = 400ms
    });
  });

  describe('Integration with caching', () => {
    it('should cache successful results after retry', async () => {
      class IntegrationService {
        private globalAttempts = 0;

        @RetryableMemoize({
          ttl: 1000,
          retries: 2,
          retryDelay: 10,
          logger: () => mockLogger
        })
        async fetchData(id: string): Promise<string> {
          callCount++;
          this.globalAttempts++;

          // Fail first 2 attempts for any ID
          if (this.globalAttempts <= 2) {
            throw new Error('Network error');
          }

          return `data-${id}`;
        }
      }

      const service = new IntegrationService();

      // First call with retries
      const result1 = await service.fetchData('123');
      expect(result1).toBe('data-123');
      expect(callCount).toBe(3); // Initial + 2 retries

      // Should use cache
      const cached1 = await service.fetchData('123');
      expect(cached1).toBe('data-123');
      expect(callCount).toBe(3);

      // Different ID should trigger new call (but no retry needed now)
      const result2 = await service.fetchData('456');
      expect(result2).toBe('data-456');
      expect(callCount).toBe(4);

      // Should also be cached
      const cached2 = await service.fetchData('456');
      expect(cached2).toBe('data-456');
      expect(callCount).toBe(4);
    });
  });
});
