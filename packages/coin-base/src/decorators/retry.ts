import { ILogger, NoOpLogger } from '../utils/logger';
import { NetworkError, HibitIdSdkErrorCode } from '../types/errors';
import { DEFAULT_NETWORK_CONFIG } from '../config/network';

/**
 * Retry decorator options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  retries?: number;

  /**
   * Initial delay between retries in milliseconds (default: 1000)
   */
  minTimeout?: number;

  /**
   * Maximum delay between retries in milliseconds (default: 5000)
   */
  maxTimeout?: number;

  /**
   * Multiplier for exponential backoff (default: 2)
   */
  factor?: number;

  /**
   * Whether to add random jitter to retry delays (default: true)
   */
  randomize?: boolean;

  /**
   * Function to determine if error should trigger retry
   * Default: retries on common network errors
   */
  shouldRetry?: (error: any) => boolean;

  /**
   * Function to get logger instance
   * If not provided, uses NoOpLogger
   */
  logger?: () => ILogger;

  /**
   * Custom error patterns to check for retry
   */
  errorPatterns?: readonly string[];

  /**
   * Chain name for error messages (optional)
   */
  chainName?: string;
}

/**
 * Common network error patterns that should trigger retries
 */
const COMMON_NETWORK_ERROR_PATTERNS = [
  'network',
  'timeout',
  'connection',
  'fetch failed',
  'request failed',
  'connect failed',
  'socket',
  'econnreset',
  'econnrefused',
  'etimedout'
] as const;

/**
 * Check if an error is a network error that should be retried
 */
function isRetriableNetworkError(error: unknown, additionalPatterns: readonly string[] = []): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Never retry validation errors
    if (
      message.includes('required') ||
      message.includes('invalid') ||
      message.includes('unsupported') ||
      message.includes('missing') ||
      message.includes('address required') ||
      message.includes('asset type')
    ) {
      return false;
    }

    const allPatterns = [...COMMON_NETWORK_ERROR_PATTERNS, ...additionalPatterns];
    return allPatterns.some((pattern) => message.includes(pattern));
  }

  return false;
}

/**
 * Retry decorator for methods
 *
 * Automatically retries failed method calls with exponential backoff
 *
 * Usage:
 * ```typescript
 * class ChainService {
 *   @Retry({ retries: 3, minTimeout: 1000 })
 *   async fetchData(id: string): Promise<Data> {
 *     return await this.rpcCall(id);
 *   }
 * }
 * ```
 */
export function Retry(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = `${className}.${propertyKey}`;

    const {
      retries = DEFAULT_NETWORK_CONFIG.RETRY.MAX_ATTEMPTS,
      minTimeout = DEFAULT_NETWORK_CONFIG.RETRY.INITIAL_DELAY_MS,
      maxTimeout = DEFAULT_NETWORK_CONFIG.RETRY.MAX_DELAY_MS,
      factor = DEFAULT_NETWORK_CONFIG.RETRY.BACKOFF_FACTOR,
      randomize = DEFAULT_NETWORK_CONFIG.RETRY.RANDOMIZE,
      errorPatterns = [],
      chainName = className,
      shouldRetry = (error) => isRetriableNetworkError(error, errorPatterns)
    } = options;

    const getLogger = function (context: any) {
      return options.logger ? options.logger.call(context) : new NoOpLogger();
    };

    descriptor.value = async function (this: any, ...args: any[]) {
      let lastError: any;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          // Don't retry if it's the last attempt or error is not retriable
          if (attempt === retries || !shouldRetry(error)) {
            break;
          }

          // Calculate delay with exponential backoff
          const baseDelay = Math.min(minTimeout * Math.pow(factor, attempt), maxTimeout);
          const jitter = randomize ? Math.random() * 0.1 * baseDelay : 0;
          const delay = baseDelay + jitter;

          const logger = getLogger(this);
          logger.warn(`${methodName} failed, retrying...`, {
            context: methodName,
            data: {
              attempt: attempt + 1,
              maxAttempts: retries + 1,
              delay: Math.round(delay),
              error: error instanceof Error ? error.message : String(error)
            }
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // All retries failed - throw NetworkError for retriable errors
      if (shouldRetry(lastError)) {
        throw new NetworkError(
          HibitIdSdkErrorCode.NETWORK_REQUEST_FAILED,
          `${chainName}: ${propertyKey} failed after ${retries + 1} attempts - ${
            lastError instanceof Error ? lastError.message : String(lastError)
          }`,
          undefined,
          {
            originalError: lastError instanceof Error ? lastError.message : String(lastError),
            attempts: retries + 1,
            lastDelay: Math.round(minTimeout * Math.pow(factor, retries - 1)),
            chain: chainName
          }
        );
      }

      throw lastError;
    };

    return descriptor;
  };
}

/**
 * Create a pre-configured Retry decorator for a specific chain
 *
 * Usage:
 * ```typescript
 * const EthereumRetry = createChainRetry('Ethereum', ['gas', 'nonce']);
 *
 * class EthereumService {
 *   @EthereumRetry({ retries: 5 })
 *   async sendTransaction(tx: Transaction): Promise<string> {
 *     return await this.web3.send(tx);
 *   }
 * }
 * ```
 */
export function createChainRetry(
  chainName: string,
  chainSpecificErrorPatterns: readonly string[] = [],
  defaultOptions: Omit<RetryOptions, 'chainName' | 'errorPatterns'> = {}
) {
  return function (options: RetryOptions = {}) {
    return Retry({
      ...defaultOptions,
      ...options,
      chainName,
      errorPatterns: [...(chainSpecificErrorPatterns || []), ...(options.errorPatterns || [])]
    });
  };
}
