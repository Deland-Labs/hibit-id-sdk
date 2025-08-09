import { describe, expect, test } from 'vitest';
import { MnemonicError, HibitIdSdkErrorCode } from '../src/types/errors';

describe('HibitIdSdkErrorCode', () => {
  test('should have all expected error codes', () => {
    expect(HibitIdSdkErrorCode.USER_CANCEL_CONNECTION).toBe('USER_CANCEL_CONNECTION');
    expect(HibitIdSdkErrorCode.WALLET_NOT_CONNECTED).toBe('WALLET_NOT_CONNECTED');
    expect(HibitIdSdkErrorCode.INVALID_MNEMONIC).toBe('INVALID_MNEMONIC');
    expect(HibitIdSdkErrorCode.MNEMONIC_DERIVATION_FAILED).toBe('MNEMONIC_DERIVATION_FAILED');
    expect(HibitIdSdkErrorCode.INVALID_DERIVATION_PATH).toBe('INVALID_DERIVATION_PATH');
  });

  test('should maintain enum structure', () => {
    const errorCodes = Object.values(HibitIdSdkErrorCode);
    expect(errorCodes.length).toBeGreaterThan(5); // We added more error codes
    expect(errorCodes).toContain('USER_CANCEL_CONNECTION');
    expect(errorCodes).toContain('WALLET_NOT_CONNECTED');
    expect(errorCodes).toContain('INVALID_MNEMONIC');
    expect(errorCodes).toContain('MNEMONIC_DERIVATION_FAILED');
    expect(errorCodes).toContain('INVALID_DERIVATION_PATH');

    // Check some new error codes
    expect(errorCodes).toContain('NETWORK_REQUEST_FAILED');
    expect(errorCodes).toContain('TRANSACTION_SIGNING_FAILED');
    expect(errorCodes).toContain('BALANCE_QUERY_FAILED');
  });
});

describe('MnemonicError', () => {
  describe('Constructor', () => {
    test('should create error with code and message', () => {
      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Invalid mnemonic phrase');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MnemonicError);
      expect(error.name).toBe('MnemonicError');
      expect(error.code).toBe(HibitIdSdkErrorCode.INVALID_MNEMONIC);
      expect(error.message).toBe('Invalid mnemonic phrase');
      expect(error.details).toBeUndefined();
    });

    test('should create error with code, message, and details', () => {
      const details = { wordCount: 11, expectedCount: 12 };
      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Invalid mnemonic word count', details);

      expect(error.code).toBe(HibitIdSdkErrorCode.INVALID_MNEMONIC);
      expect(error.message).toBe('Invalid mnemonic word count');
      expect(error.details).toEqual(details);
    });

    test('should handle all error codes', () => {
      const codes = [
        HibitIdSdkErrorCode.USER_CANCEL_CONNECTION,
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        HibitIdSdkErrorCode.INVALID_MNEMONIC,
        HibitIdSdkErrorCode.MNEMONIC_DERIVATION_FAILED,
        HibitIdSdkErrorCode.INVALID_DERIVATION_PATH
      ];

      codes.forEach((code) => {
        const error = new MnemonicError(code, `Test message for ${code}`);
        expect(error.code).toBe(code);
        expect(error.message).toBe(`Test message for ${code}`);
      });
    });
  });

  describe('Error Properties', () => {
    test('should have correct name property', () => {
      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Test message');

      expect(error.name).toBe('MnemonicError');
    });

    test('should inherit from Error', () => {
      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Test message');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof MnemonicError).toBe(true);
    });

    test('should have stack trace', () => {
      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Test message');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('Error Details', () => {
    test('should store complex details object', () => {
      const details = {
        originalMnemonic: 'word1 word2 word3',
        wordCount: 3,
        validationErrors: ['word1 not in wordlist', 'word2 not in wordlist'],
        timestamp: new Date().toISOString()
      };

      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Mnemonic validation failed', details);

      expect(error.details).toEqual(details);
      expect(error.details?.wordCount).toBe(3);
      expect(error.details?.validationErrors).toHaveLength(2);
    });

    test('should handle null details', () => {
      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Test message', undefined);

      expect(error.details).toBe(undefined);
    });

    test('should handle primitive details', () => {
      const error1 = new MnemonicError(HibitIdSdkErrorCode.INVALID_DERIVATION_PATH, 'Test message', {
        message: 'invalid path format'
      });

      const error2 = new MnemonicError(HibitIdSdkErrorCode.MNEMONIC_DERIVATION_FAILED, 'Test message', { errorCode: 42 });

      expect(error1.details).toEqual({ message: 'invalid path format' });
      expect(error2.details).toEqual({ errorCode: 42 });
    });
  });

  describe('Error Throwing and Catching', () => {
    test('should be throwable and catchable', () => {
      const throwError = () => {
        throw new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Test throw');
      };

      expect(throwError).toThrow(MnemonicError);
      expect(throwError).toThrow('Test throw');

      try {
        throwError();
      } catch (error) {
        expect(error).toBeInstanceOf(MnemonicError);
        expect((error as MnemonicError).code).toBe(HibitIdSdkErrorCode.INVALID_MNEMONIC);
      }
    });

    test('should be catchable as generic Error', () => {
      const throwError = () => {
        throw new MnemonicError(HibitIdSdkErrorCode.WALLET_NOT_CONNECTED, 'Wallet disconnected');
      };

      try {
        throwError();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Wallet disconnected');
      }
    });
  });

  describe('Error Serialization', () => {
    test('should convert to string properly', () => {
      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Invalid mnemonic phrase');

      const errorString = error.toString();
      expect(errorString).toContain('MnemonicError');
      expect(errorString).toContain('Invalid mnemonic phrase');
    });

    test('should handle JSON serialization of details', () => {
      const details = { wordCount: 11, expectedCount: 12 };
      const error = new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Invalid word count', details);

      // Test that details can be serialized
      const serializedDetails = JSON.stringify(error.details);
      const parsedDetails = JSON.parse(serializedDetails);

      expect(parsedDetails).toEqual(details);
    });
  });
});
