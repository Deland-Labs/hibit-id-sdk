import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Retry } from '../../src/decorators/retry';
import { ILogger } from '../../src/utils/logger';
import { NetworkError, HibitIdSdkErrorCode } from '../../src/types/errors';

describe('Retry decorator', () => {
  let mockLogger: ILogger;
  let callCount: number;

  beforeEach(() => {
    callCount = 0;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger)
    };
  });

  describe('Basic retry functionality', () => {
    it('should retry on failure and succeed', async () => {
      class RetryService {
        private attempts = 0;

        @Retry({
          retries: 3,
          minTimeout: 10,
          logger: () => mockLogger
        })
        async fetchData(id: string): Promise<string> {
          callCount++;
          this.attempts++;

          if (this.attempts < 3) {
            throw new Error('Network timeout');
          }

          return `data-${id}`;
        }
      }

      const service = new RetryService();
      const result = await service.fetchData('123');

      expect(result).toBe('data-123');
      expect(callCount).toBe(3); // Initial + 2 retries

      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed, retrying'),
        expect.objectContaining({
          context: expect.any(String),
          data: expect.objectContaining({
            attempt: expect.any(Number),
            maxAttempts: 4,
            delay: expect.any(Number),
            error: 'Network timeout'
          })
        })
      );
    });

    it('should throw after max retries', async () => {
      class FailingService {
        @Retry({
          retries: 2,
          minTimeout: 10,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          callCount++;
          throw new Error('Connection refused');
        }
      }

      const service = new FailingService();

      await expect(service.fetchData()).rejects.toThrow(NetworkError);
      expect(callCount).toBe(3); // Initial + 2 retries
    });

    it('should not retry if retries is 0', async () => {
      class NoRetryService {
        @Retry({
          retries: 0,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          callCount++;
          throw new Error('Error');
        }
      }

      const service = new NoRetryService();

      await expect(service.fetchData()).rejects.toThrow('Error');
      expect(callCount).toBe(1); // Only initial attempt
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Error pattern matching', () => {
    it('should retry only on matching error patterns', async () => {
      class PatternService {
        private callIndex = 0;
        private errors = ['ETIMEDOUT: connection timeout', 'ECONNREFUSED: connection refused', 'Invalid input'];

        @Retry({
          retries: 3,
          minTimeout: 10,
          errorPatterns: ['ETIMEDOUT', 'ECONNREFUSED'],
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          callCount++;
          if (this.callIndex < this.errors.length) {
            throw new Error(this.errors[this.callIndex++]);
          }
          return 'success';
        }
      }

      const service = new PatternService();

      // Should throw "Invalid input" because it doesn't match the error patterns
      await expect(service.fetchData()).rejects.toThrow('Invalid input');

      // Should have made 3 attempts: initial (timeout) + retry (refused) + retry (invalid - throws)
      expect(callCount).toBe(3);
    });

    it('should use custom shouldRetry function', async () => {
      class CustomRetryService {
        private attempts = 0;

        @Retry({
          retries: 3,
          minTimeout: 10,
          shouldRetry: (error) => {
            return error.code === 'CUSTOM_RETRY';
          },
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          callCount++;
          this.attempts++;

          if (this.attempts === 1) {
            const error = new Error('Custom error');
            (error as any).code = 'CUSTOM_RETRY';
            throw error;
          }

          if (this.attempts === 2) {
            throw new Error('Should not retry this');
          }

          return 'success';
        }
      }

      const service = new CustomRetryService();

      await expect(service.fetchData()).rejects.toThrow('Should not retry this');
      expect(callCount).toBe(2); // Initial + 1 retry (second error doesn't trigger retry)
    });
  });

  describe('Exponential backoff', () => {
    it('should apply exponential backoff with jitter', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Mock setTimeout to capture delays
      global.setTimeout = ((fn: Function, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0);
      }) as any;

      class BackoffService {
        private attempts = 0;

        @Retry({
          retries: 3,
          minTimeout: 100,
          maxTimeout: 1000,
          factor: 2,
          randomize: true,
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

      // Check that delays increase exponentially
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[0]).toBeLessThanOrEqual(110); // 100 + 10% jitter

      expect(delays[1]).toBeGreaterThanOrEqual(200);
      expect(delays[1]).toBeLessThanOrEqual(220); // 200 + 10% jitter

      expect(delays[2]).toBeGreaterThanOrEqual(400);
      expect(delays[2]).toBeLessThanOrEqual(440); // 400 + 10% jitter
    });

    it('should respect maxTimeout', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = ((fn: Function, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0);
      }) as any;

      class MaxTimeoutService {
        private attempts = 0;

        @Retry({
          retries: 5,
          minTimeout: 100,
          maxTimeout: 300,
          factor: 2,
          randomize: false,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          this.attempts++;

          if (this.attempts <= 5) {
            throw new Error('Network error');
          }

          return 'success';
        }
      }

      const service = new MaxTimeoutService();

      try {
        await service.fetchData();
      } finally {
        global.setTimeout = originalSetTimeout;
      }

      // Check that delays are capped at maxTimeout
      expect(delays[0]).toBe(100); // 100
      expect(delays[1]).toBe(200); // 100 * 2
      expect(delays[2]).toBe(300); // Would be 400, but capped at 300
      expect(delays[3]).toBe(300); // Capped at 300
      expect(delays[4]).toBe(300); // Capped at 300
    });
  });

  describe('Logger integration', () => {
    it('should use logger from function', async () => {
      let loggerCallCount = 0;
      const originalCallCount = callCount;

      class DynamicLoggerService {
        logger: ILogger = {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          child: vi.fn(() => this.logger)
        };

        getLogger(): ILogger {
          loggerCallCount++;
          return this.logger;
        }

        @Retry({
          retries: 2,
          minTimeout: 10,
          logger: function (this: DynamicLoggerService) {
            return this.getLogger();
          }
        })
        async fetchData(): Promise<string> {
          callCount++;
          throw new Error('Network timeout');
        }
      }

      const service = new DynamicLoggerService();

      await expect(service.fetchData()).rejects.toThrow(NetworkError);

      // Should make 3 attempts (initial + 2 retries)
      expect(callCount - originalCallCount).toBe(3);

      // Logger function should be called for each retry warning
      expect(loggerCallCount).toBe(2); // Called for each retry attempt
      expect(service.logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should use static logger instance', async () => {
      const originalCallCount = callCount;

      // Clear mocks before this specific test
      vi.clearAllMocks();

      class StaticLoggerService {
        @Retry({
          retries: 1,
          minTimeout: 10,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          callCount++;
          throw new Error('Network timeout');
        }
      }

      const service = new StaticLoggerService();

      await expect(service.fetchData()).rejects.toThrow(NetworkError);

      // Should make 2 attempts (initial + 1 retry)
      expect(callCount - originalCallCount).toBe(2);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('NetworkError wrapping', () => {
    it('should wrap retriable errors in NetworkError', async () => {
      class NetworkErrorService {
        @Retry({
          retries: 2,
          minTimeout: 10,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          throw new Error('ECONNREFUSED: Connection refused');
        }
      }

      const service = new NetworkErrorService();

      try {
        await service.fetchData();
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).code).toBe('NETWORK_REQUEST_FAILED');
        expect((error as NetworkError).details?.originalError).toBe('ECONNREFUSED: Connection refused');
        expect((error as NetworkError).details?.attempts).toBe(3);
        expect((error as NetworkError).details?.lastDelay).toBeGreaterThan(0);
      }
    });

    it('should not wrap non-retriable errors', async () => {
      class NonRetriableService {
        @Retry({
          retries: 2,
          minTimeout: 10,
          shouldRetry: () => false,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          throw new Error('Business logic error');
        }
      }

      const service = new NonRetriableService();

      await expect(service.fetchData()).rejects.toThrow('Business logic error');
      await expect(service.fetchData()).rejects.not.toThrow(NetworkError);
    });
  });

  describe('Successful execution', () => {
    it('should not retry on successful execution', async () => {
      class SuccessService {
        @Retry({
          retries: 3,
          logger: () => mockLogger
        })
        async fetchData(value: string): Promise<string> {
          callCount++;
          return `success-${value}`;
        }
      }

      const service = new SuccessService();
      const result = await service.fetchData('123');

      expect(result).toBe('success-123');
      expect(callCount).toBe(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Complex error scenarios', () => {
    it('should handle WalletError instances', async () => {
      class WalletErrorService {
        private attempts = 0;

        @Retry({
          retries: 3,
          minTimeout: 10,
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          callCount++;
          this.attempts++;

          if (this.attempts === 1) {
            throw new NetworkError(HibitIdSdkErrorCode.NETWORK_TIMEOUT, 'Connection timeout', undefined, {
              timeout: 5000
            });
          }

          return 'recovered';
        }
      }

      const service = new WalletErrorService();
      const result = await service.fetchData();

      expect(result).toBe('recovered');
      expect(callCount).toBe(2);
    });

    it('should handle non-Error objects', async () => {
      class NonErrorService {
        private attempts = 0;

        @Retry({
          retries: 2,
          minTimeout: 10,
          shouldRetry: (error) => error === 'retry-me',
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          callCount++;
          this.attempts++;

          if (this.attempts === 1) {
            throw 'retry-me';
          }

          if (this.attempts === 2) {
            throw { code: 'CUSTOM_ERROR', message: 'No retry' };
          }

          return 'success';
        }
      }

      const service = new NonErrorService();

      await expect(service.fetchData()).rejects.toEqual({
        code: 'CUSTOM_ERROR',
        message: 'No retry'
      });

      expect(callCount).toBe(2); // Initial + 1 retry
    });
  });

  describe('Chain name configuration', () => {
    it('should use custom chain name in logs', async () => {
      class ChainService {
        @Retry({
          retries: 1,
          minTimeout: 10,
          chainName: 'Ethereum',
          logger: () => mockLogger
        })
        async fetchData(): Promise<string> {
          throw new Error('RPC timeout');
        }
      }

      const service = new ChainService();

      await expect(service.fetchData()).rejects.toThrow();

      // Check that the custom chain name is used in error details
      try {
        await service.fetchData();
      } catch (error) {
        expect((error as NetworkError).details?.chain).toBe('Ethereum');
      }
    });
  });
});
