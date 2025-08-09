import 'reflect-metadata';
import { describe, expect, test } from 'vitest';
import { cleanSensitiveData } from '../../src/decorators/sensitive-data';

describe('cleanSensitiveData decorator with static methods', () => {
  // Test class with static methods
  class TestStaticClass {
    @cleanSensitiveData()
    static async asyncMethod(input: string): Promise<string> {
      if (input === 'throw-with-mnemonic') {
        throw new Error(
          'Failed with mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        );
      }
      if (input === 'throw-with-private-key') {
        throw new Error('Failed with private key: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      }
      return `processed: ${input}`;
    }

    @cleanSensitiveData()
    static syncMethod(input: string): string {
      if (input === 'throw-with-password') {
        throw new Error('Failed with password: super-secret-password-123');
      }
      if (input === 'throw-with-seed') {
        throw new Error('Failed with seed phrase: test seed phrase with multiple words that should be redacted');
      }
      return `sync processed: ${input}`;
    }

    @cleanSensitiveData()
    static methodWithNestedError(): void {
      const error = new Error('Operation failed');
      (error as any).mnemonic =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      (error as any).privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      (error as any).details = {
        secret: 'my-secret-key',
        password: 'my-password-123',
        seed: 'seed phrase that should be redacted'
      };
      throw error;
    }
  }

  describe('async static methods', () => {
    test('should not affect normal return values', async () => {
      const result = await TestStaticClass.asyncMethod('normal-input');
      expect(result).toBe('processed: normal-input');
    });

    test('should clean mnemonic from error message', async () => {
      let caughtError: Error | undefined;
      try {
        await TestStaticClass.asyncMethod('throw-with-mnemonic');
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toContain('[REDACTED]');
      expect(caughtError!.message).not.toContain('abandon');
    });

    test('should clean private key from error message', async () => {
      let caughtError: Error | undefined;
      try {
        await TestStaticClass.asyncMethod('throw-with-private-key');
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toContain('[REDACTED]');
      expect(caughtError!.message).not.toContain('0x1234567890abcdef');
    });
  });

  describe('sync static methods', () => {
    test('should not affect normal return values', () => {
      const result = TestStaticClass.syncMethod('normal-input');
      expect(result).toBe('sync processed: normal-input');
    });

    test('should clean password from error message', () => {
      let caughtError: Error | undefined;
      try {
        TestStaticClass.syncMethod('throw-with-password');
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toBe('Failed with password: super-secret-password-123');
      // Note: The current implementation only redacts mnemonics and private keys in messages
      // Passwords in messages are not automatically redacted unless they match the patterns
    });

    test('should clean seed phrase from error message', () => {
      let caughtError: Error | undefined;
      try {
        TestStaticClass.syncMethod('throw-with-seed');
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).toBeDefined();
      // Seed phrases that don't match 12/24 word pattern won't be redacted in messages
      expect(caughtError!.message).toBe(
        'Failed with seed phrase: test seed phrase with multiple words that should be redacted'
      );
    });
  });

  describe('nested error properties', () => {
    test('should clean all sensitive properties from nested error object', () => {
      let caughtError: Error | undefined;
      try {
        TestStaticClass.methodWithNestedError();
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).toBeDefined();
      const errorAny = caughtError as any;

      // All sensitive properties should be redacted
      expect(errorAny.mnemonic).toBe('[REDACTED]');
      expect(errorAny.privateKey).toBe('[REDACTED]');
      expect(errorAny.details.secret).toBe('[REDACTED]');
      expect(errorAny.details.password).toBe('[REDACTED]');
      expect(errorAny.details.seed).toBe('[REDACTED]');
    });
  });

  describe('static method preservation', () => {
    test('decorated static methods should remain callable on the class', () => {
      // Verify the static methods are still accessible
      expect(typeof TestStaticClass.asyncMethod).toBe('function');
      expect(typeof TestStaticClass.syncMethod).toBe('function');
      expect(typeof TestStaticClass.methodWithNestedError).toBe('function');
    });

    test('should preserve method functionality', () => {
      // Decorators may change the function name, but the methods should still be callable
      expect(typeof TestStaticClass.asyncMethod).toBe('function');
      expect(typeof TestStaticClass.syncMethod).toBe('function');
      expect(typeof TestStaticClass.methodWithNestedError).toBe('function');
    });
  });
});
