import { describe, expect, test, vi, beforeEach } from 'vitest';
import { withLogging } from '../../src/decorators/logging';
import { ILogger } from '../../src/utils/logger';

// Mock logger
class MockLogger implements ILogger {
  debug = vi.fn();
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
  child = vi.fn(() => this);
}

// Test class
class TestService {
  logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  @withLogging('test operation')
  async simpleMethod(): Promise<string> {
    return 'success';
  }

  @withLogging(
    'complex operation',
    (args) => ({ input: String(args[0]), count: Number(args[1]) }),
    (result) => ({ output: String(result) })
  )
  async complexMethod(input: string, count: number): Promise<string> {
    return `${input}-${count}`;
  }

  @withLogging('failing operation')
  async failingMethod(): Promise<string> {
    throw new Error('Test error');
  }
}

describe('withLogging decorator', () => {
  let logger: MockLogger;
  let service: TestService;

  beforeEach(() => {
    logger = new MockLogger();
    service = new TestService(logger);
    vi.clearAllMocks();
  });

  test('should log debug message when method starts', async () => {
    await service.simpleMethod();

    expect(logger.debug).toHaveBeenCalledWith('Starting test operation', {
      context: 'TestService.simpleMethod',
      data: {}
    });
  });

  test('should log info message when method succeeds', async () => {
    const result = await service.simpleMethod();

    expect(result).toBe('success');
    expect(logger.info).toHaveBeenCalledWith('test operation successful', {
      context: 'TestService.simpleMethod',
      data: {
        success: true
      }
    });
  });

  test('should use context extractor when provided', async () => {
    await service.complexMethod('test', 42);

    expect(logger.debug).toHaveBeenCalledWith('Starting complex operation', {
      context: 'TestService.complexMethod',
      data: {
        input: 'test',
        count: 42
      }
    });
  });

  test('should use result extractor when provided', async () => {
    const result = await service.complexMethod('test', 42);

    expect(result).toBe('test-42');
    expect(logger.info).toHaveBeenCalledWith('complex operation successful', {
      context: 'TestService.complexMethod',
      data: {
        input: 'test',
        count: 42,
        output: 'test-42'
      }
    });
  });

  test('should log error when method throws', async () => {
    const error = new Error('Test error');

    await expect(service.failingMethod()).rejects.toThrow('Test error');

    expect(logger.error).toHaveBeenCalledWith('failing operation failed', {
      error,
      context: 'TestService.failingMethod',
      data: {}
    });
  });

  test('should rethrow original error even when logging fails', async () => {
    // Make logger.error throw, but the original error should still be thrown
    logger.error = vi.fn().mockImplementation(() => {
      throw new Error('Logger error');
    });

    // The decorator should catch the logger error and still throw the original error
    await expect(service.failingMethod()).rejects.toThrow('Test error');
  });
});
