import { describe, expect, test, beforeEach } from 'vitest';
import { cleanSensitiveData } from '../../src/decorators/sensitive-data';

// Test class
class TestService {
  @cleanSensitiveData()
  async methodWithMnemonicError(): Promise<void> {
    const error = new Error(
      'Invalid mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    );
    throw error;
  }

  @cleanSensitiveData()
  async methodWithPrivateKeyError(): Promise<void> {
    const error: any = new Error('Failed to sign with private key');
    error.privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    error.details = {
      mnemonic: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
      secret: 'super-secret-value'
    };
    throw error;
  }

  @cleanSensitiveData()
  async methodWithNestedError(): Promise<void> {
    const innerError: any = new Error('Inner error');
    innerError.seed = 'seed phrase with many words that should be redacted completely';

    const outerError: any = new Error('Outer error');
    outerError.cause = innerError;
    outerError.password = 'my-password-123';

    throw outerError;
  }

  @cleanSensitiveData()
  async methodThatSucceeds(): Promise<string> {
    return 'success';
  }
}

describe('cleanSensitiveData decorator', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
  });

  test('should clean mnemonic from error message', async () => {
    try {
      await service.methodWithMnemonicError();
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toBe('Invalid mnemonic: [REDACTED]');
      expect(error.message).not.toContain('abandon');
    }
  });

  test('should clean private key from error properties', async () => {
    try {
      await service.methodWithPrivateKeyError();
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.privateKey).toBe('[REDACTED]');
      expect(error.details.mnemonic).toBe('[REDACTED]');
      expect(error.details.secret).toBe('[REDACTED]');
      expect(error.message).toBe('Failed to sign with private key');
    }
  });

  test('should clean nested errors', async () => {
    try {
      await service.methodWithNestedError();
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.password).toBe('[REDACTED]');
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause.seed).toBe('[REDACTED]');
    }
  });

  test('should not affect successful methods', async () => {
    const result = await service.methodThatSucceeds();
    expect(result).toBe('success');
  });

  test('should handle non-Error objects', async () => {
    class ServiceWithNonError {
      @cleanSensitiveData()
      async method(): Promise<void> {
        throw 'string error';
      }
    }

    const service = new ServiceWithNonError();
    await expect(service.method()).rejects.toBe('string error');
  });

  test('should clean 24-word mnemonics', async () => {
    class ServiceWith24Words {
      @cleanSensitiveData()
      async method(): Promise<void> {
        throw new Error(
          'Mnemonic is: word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24'
        );
      }
    }

    const service = new ServiceWith24Words();
    try {
      await service.method();
      expect.fail('Should have thrown');
    } catch (error: any) {
      // The 24-word mnemonic will match both 12-word and 24-word patterns
      expect(error.message).toBe('Mnemonic is: [REDACTED] [REDACTED]');
    }
  });
});
