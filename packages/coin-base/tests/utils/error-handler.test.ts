import { describe, expect, test } from 'vitest';
import { wrapError, withErrorHandling, ErrorHandlerConfig } from '../../src/decorators/error-handling';
import {
  WalletError,
  MessageSigningError,
  BalanceQueryError,
  TransactionError,
  FeeEstimationError,
  HibitIdSdkErrorCode
} from '../../src/types/errors';
import { GeneralWalletError } from '../../src/types/general-wallet-error';

describe('wrapError', () => {
  const baseConfig: ErrorHandlerConfig = {
    chainName: 'TestChain',
    errorType: 'general'
  };

  test('should return existing WalletError unchanged', () => {
    const originalError = new MessageSigningError(
      HibitIdSdkErrorCode.MESSAGE_SIGNING_FAILED,
      'Original error',
      new TextEncoder().encode('test message')
    );

    const wrapped = wrapError(originalError, baseConfig, 'Default message');
    expect(wrapped).toBe(originalError);
  });

  test('should wrap Error in GeneralWalletError for general type', () => {
    const originalError = new Error('Something went wrong');
    const wrapped = wrapError(originalError, baseConfig, 'Operation failed');

    expect(wrapped).toBeInstanceOf(GeneralWalletError);
    expect(wrapped.message).toBe('TestChain: Operation failed - Something went wrong');
    expect(wrapped.code).toBe(HibitIdSdkErrorCode.UNKNOWN_ERROR);
    expect(wrapped.cause).toBe(originalError);
  });

  test('should wrap in MessageSigningError for signing type', () => {
    const config: ErrorHandlerConfig = {
      chainName: 'TestChain',
      errorType: 'signing',
      context: { message: 'Hello World' }
    };

    const wrapped = wrapError(new Error('Signing failed'), config, 'Failed to sign message');

    expect(wrapped).toBeInstanceOf(MessageSigningError);
    expect(wrapped.code).toBe(HibitIdSdkErrorCode.MESSAGE_SIGNING_FAILED);
    expect((wrapped as MessageSigningError).signature).toEqual(new TextEncoder().encode('Hello World'));
  });

  test('should wrap in BalanceQueryError for balance type', () => {
    const config: ErrorHandlerConfig = {
      chainName: 'TestChain',
      errorType: 'balance',
      context: {
        address: '0x123',
        tokenAddress: '0xabc'
      }
    };

    const wrapped = wrapError(new Error('Balance query failed'), config, 'Failed to query balance');

    expect(wrapped).toBeInstanceOf(BalanceQueryError);
    expect(wrapped.code).toBe(HibitIdSdkErrorCode.BALANCE_QUERY_FAILED);
    expect((wrapped as BalanceQueryError).address).toBe('0x123');
    expect((wrapped as BalanceQueryError).assetIdentifier).toBe('0xabc');
  });

  test('should wrap in TransactionError for transaction type', () => {
    const config: ErrorHandlerConfig = {
      chainName: 'TestChain',
      errorType: 'transaction',
      context: {
        transactionHash: '0xtxhash'
      }
    };

    const wrapped = wrapError(new Error('Transaction failed'), config, 'Failed to send transaction');

    expect(wrapped).toBeInstanceOf(TransactionError);
    expect(wrapped.code).toBe(HibitIdSdkErrorCode.TRANSACTION_SIGNING_FAILED);
    expect((wrapped as TransactionError).transactionHash).toBe('0xtxhash');
  });

  test('should wrap in FeeEstimationError for fee type', () => {
    const config: ErrorHandlerConfig = {
      chainName: 'TestChain',
      errorType: 'fee',
      context: {
        amount: '1000'
      }
    };

    const wrapped = wrapError(new Error('Fee estimation failed'), config, 'Failed to estimate fee');

    expect(wrapped).toBeInstanceOf(FeeEstimationError);
    expect(wrapped.code).toBe(HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED);
  });

  test('should handle non-Error objects', () => {
    const wrapped = wrapError('string error', baseConfig, 'Operation failed');

    expect(wrapped).toBeInstanceOf(GeneralWalletError);
    expect(wrapped.message).toBe('TestChain: Operation failed - string error');
    expect(wrapped.cause).toBeUndefined();
  });
});

describe('withErrorHandling decorator', () => {
  class TestService {
    @withErrorHandling({ chainName: 'TestChain', errorType: 'signing' }, 'Failed to sign')
    async signMessage(message: string): Promise<string> {
      if (message === 'fail') {
        throw new Error('Signing error');
      }
      return `signed: ${message}`;
    }

    @withErrorHandling({ chainName: 'TestChain', errorType: 'balance' }, 'Failed to get balance')
    async getBalance(): Promise<number> {
      throw new Error('Network error');
    }
  }

  test('should not affect successful methods', async () => {
    const service = new TestService();
    const result = await service.signMessage('hello');
    expect(result).toBe('signed: hello');
  });

  test('should wrap errors with appropriate error type', async () => {
    const service = new TestService();

    try {
      await service.signMessage('fail');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(MessageSigningError);
      expect((error as WalletError).message).toBe('TestChain: Failed to sign - Signing error');
    }
  });

  test('should preserve error details', async () => {
    const service = new TestService();

    try {
      await service.getBalance();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BalanceQueryError);
      expect((error as WalletError).code).toBe(HibitIdSdkErrorCode.BALANCE_QUERY_FAILED);
      expect((error as WalletError).details?.chainName).toBe('TestChain');
    }
  });
});
