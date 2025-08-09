import { describe, it, expect, beforeEach } from 'vitest';
import { ChainType } from '@delandlabs/hibit-basic-types';
import { ChainValidation, ChainValidator } from '../../src/validation';

// Test validator implementation
class TestValidator implements ChainValidator {
  constructor(
    private walletPattern: string,
    private tokenPattern: string = ''
  ) {}

  validateWalletAddress(address: string): boolean {
    return address.startsWith(this.walletPattern);
  }

  validateTokenAddress(tokenAddress: string): boolean {
    return this.tokenPattern ? tokenAddress.startsWith(this.tokenPattern) : this.validateWalletAddress(tokenAddress);
  }
}

describe('ChainValidation', () => {
  beforeEach(() => {
    // Clear all validators before each test
    ChainValidation.clear();
  });

  describe('register', () => {
    it('should register a validator for a chain', () => {
      const validator = new TestValidator('0x');
      ChainValidation.register(ChainType.Ethereum, validator);

      expect(ChainValidation.hasValidator(ChainType.Ethereum)).toBe(true);
    });

    it('should allow replacing an existing validator', () => {
      const validator1 = new TestValidator('0x');
      const validator2 = new TestValidator('eth:');

      ChainValidation.register(ChainType.Ethereum, validator1);
      expect(ChainValidation.isValidWalletAddress('0x123', ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.isValidWalletAddress('eth:123', ChainType.Ethereum)).toBe(false);

      ChainValidation.register(ChainType.Ethereum, validator2);
      expect(ChainValidation.isValidWalletAddress('0x123', ChainType.Ethereum)).toBe(false);
      expect(ChainValidation.isValidWalletAddress('eth:123', ChainType.Ethereum)).toBe(true);
    });
  });

  describe('isValidWalletAddress', () => {
    it('should validate wallet addresses using registered validator', () => {
      const validator = new TestValidator('0x');
      ChainValidation.register(ChainType.Ethereum, validator);

      expect(ChainValidation.isValidWalletAddress('0x1234567890abcdef', ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.isValidWalletAddress('1234567890abcdef', ChainType.Ethereum)).toBe(false);
    });

    it('should throw error if no validator is registered', () => {
      expect(() => {
        ChainValidation.isValidWalletAddress('any_address', ChainType.Bitcoin);
      }).toThrow('No validator registered for chain: Bitcoin');
    });

    it('should work with different validators for different chains', () => {
      const ethValidator = new TestValidator('0x');
      const solValidator = new TestValidator('sol:');

      ChainValidation.register(ChainType.Ethereum, ethValidator);
      ChainValidation.register(ChainType.Solana, solValidator);

      expect(ChainValidation.isValidWalletAddress('0x123', ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.isValidWalletAddress('sol:123', ChainType.Ethereum)).toBe(false);

      expect(ChainValidation.isValidWalletAddress('sol:123', ChainType.Solana)).toBe(true);
      expect(ChainValidation.isValidWalletAddress('0x123', ChainType.Solana)).toBe(false);
    });
  });

  describe('isValidTokenAddress', () => {
    it('should validate token addresses using registered validator', () => {
      const validator = new TestValidator('0x', 'token:');
      ChainValidation.register(ChainType.Ethereum, validator);

      expect(ChainValidation.isValidTokenAddress('token:ABC', ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.isValidTokenAddress('0xABC', ChainType.Ethereum)).toBe(false);
    });

    it('should throw error if no validator is registered', () => {
      expect(() => {
        ChainValidation.isValidTokenAddress('any_token', ChainType.Bitcoin);
      }).toThrow('No validator registered for chain: Bitcoin');
    });

    it('should use same validation as wallet if token pattern not specified', () => {
      const validator = new TestValidator('0x');
      ChainValidation.register(ChainType.Ethereum, validator);

      expect(ChainValidation.isValidTokenAddress('0x123', ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.isValidTokenAddress('token:123', ChainType.Ethereum)).toBe(false);
    });
  });

  describe('hasValidator', () => {
    it('should return true if validator is registered', () => {
      const validator = new TestValidator('0x');
      ChainValidation.register(ChainType.Ethereum, validator);

      expect(ChainValidation.hasValidator(ChainType.Ethereum)).toBe(true);
    });

    it('should return false if no validator is registered', () => {
      expect(ChainValidation.hasValidator(ChainType.Bitcoin)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all registered validators', () => {
      const ethValidator = new TestValidator('0x');
      const solValidator = new TestValidator('sol:');

      ChainValidation.register(ChainType.Ethereum, ethValidator);
      ChainValidation.register(ChainType.Solana, solValidator);

      expect(ChainValidation.hasValidator(ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.hasValidator(ChainType.Solana)).toBe(true);

      ChainValidation.clear();

      expect(ChainValidation.hasValidator(ChainType.Ethereum)).toBe(false);
      expect(ChainValidation.hasValidator(ChainType.Solana)).toBe(false);
    });
  });

  describe('error messages', () => {
    it('should include chain name in error message', () => {
      // Test known chain
      expect(() => {
        ChainValidation.isValidWalletAddress('test', ChainType.Ethereum);
      }).toThrow('No validator registered for chain: Ethereum');

      // Test unknown chain (should show numeric value)
      const unknownChain = 9999 as ChainType;
      expect(() => {
        ChainValidation.isValidWalletAddress('test', unknownChain);
      }).toThrow('No validator registered for chain: Unknown(9999)');
    });
  });
});
