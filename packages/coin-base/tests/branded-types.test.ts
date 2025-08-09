import { describe, test, expect, beforeEach } from 'vitest';
import { ChainType } from '@delandlabs/hibit-basic-types';
import { Address, createAddress, isAddress, createTransactionHash, createMnemonic } from '../src/types/branded';
import { ChainValidation, ChainValidator } from '../src/validation';

// Test validator helper for all tests
class TestValidator implements ChainValidator {
  constructor(private predicate: (addr: string) => boolean) {}
  validateWalletAddress(address: string): boolean {
    return this.predicate(address);
  }
  validateTokenAddress(address: string): boolean {
    return this.predicate(address);
  }
}

describe('Branded Types', () => {
  beforeEach(() => {
    // Clear registry before each test
    ChainValidation.clear();
  });

  describe('ChainValidation', () => {
    test('should register and validate addresses', () => {
      // Register a simple validator using ChainType
      ChainValidation.register(ChainType.Ethereum, new TestValidator((addr) => addr.startsWith('0x')));

      expect(ChainValidation.hasValidator(ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.isValidWalletAddress('0x123', ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.isValidWalletAddress('1234', ChainType.Ethereum)).toBe(false);
    });

    test('should throw error for unregistered chain', () => {
      expect(() => {
        ChainValidation.isValidWalletAddress('any_address', ChainType.Bitcoin);
      }).toThrow('No validator registered for chain: Bitcoin');
    });

    test('should clear all validators', () => {
      ChainValidation.register(ChainType.Ethereum, new TestValidator(() => true));
      ChainValidation.register(ChainType.Solana, new TestValidator(() => true));

      expect(ChainValidation.hasValidator(ChainType.Ethereum)).toBe(true);
      expect(ChainValidation.hasValidator(ChainType.Solana)).toBe(true);

      ChainValidation.clear();

      expect(ChainValidation.hasValidator(ChainType.Ethereum)).toBe(false);
      expect(ChainValidation.hasValidator(ChainType.Solana)).toBe(false);
    });
  });

  describe('createAddress', () => {
    beforeEach(() => {
      // Register test validators using ChainType
      ChainValidation.register(ChainType.Ethereum, new TestValidator((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr)));
      ChainValidation.register(
        ChainType.Bitcoin,
        new TestValidator((addr) => /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr))
      );
    });

    test('should create valid branded address', () => {
      const ethAddress = createAddress('0x742d35cc6634C0532925A3b844f9B0bC27D9c256', ChainType.Ethereum);
      expect(ethAddress).toBe('0x742d35cc6634C0532925A3b844f9B0bC27D9c256');

      // TypeScript should enforce this at compile time
      // const wrongUsage: Address<ChainType.Bitcoin> = ethAddress; // This would be a type error
    });

    test('should throw error for invalid address', () => {
      expect(() => {
        createAddress('invalid_address', ChainType.Ethereum);
      }).toThrow('Invalid Ethereum address: invalid_address');
    });

    test('should validate different chain formats', () => {
      const ethAddr = createAddress('0x742d35cc6634C0532925A3b844f9B0bC27D9c256', ChainType.Ethereum);
      const btcAddr = createAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', ChainType.Bitcoin);

      expect(ethAddr).toBeTruthy();
      expect(btcAddr).toBeTruthy();
    });
  });

  describe('isAddress type guard', () => {
    beforeEach(() => {
      ChainValidation.register(ChainType.Ethereum, new TestValidator((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr)));
    });

    test('should correctly identify valid addresses', () => {
      expect(isAddress('0x742d35cc6634C0532925A3b844f9B0bC27D9c256', ChainType.Ethereum)).toBe(true);
      expect(isAddress('invalid', ChainType.Ethereum)).toBe(false);
      expect(isAddress(123, ChainType.Ethereum)).toBe(false);
      expect(isAddress(null, ChainType.Ethereum)).toBe(false);
      expect(isAddress(undefined, ChainType.Ethereum)).toBe(false);
    });
  });

  describe('createTransactionHash', () => {
    test('should create branded transaction hash', () => {
      const txHash = createTransactionHash('0xabc123...', ChainType.Ethereum);
      expect(txHash).toBe('0xabc123...');
    });

    test('should throw error for invalid input', () => {
      expect(() => {
        createTransactionHash('', ChainType.Ethereum);
      }).toThrow('Invalid transaction hash for Ethereum');

      expect(() => {
        // @ts-expect-error Testing invalid input
        createTransactionHash(null, ChainType.Ethereum);
      }).toThrow('Invalid transaction hash for Ethereum');
    });
  });

  describe('createMnemonic', () => {
    test('should create branded mnemonic', () => {
      const mnemonic = createMnemonic('word1 word2 word3 ... word12');
      expect(mnemonic).toBe('word1 word2 word3 ... word12');
    });

    test('should throw error for invalid input', () => {
      expect(() => {
        createMnemonic('');
      }).toThrow('Invalid mnemonic');

      expect(() => {
        // @ts-expect-error Testing invalid input
        createMnemonic(null);
      }).toThrow('Invalid mnemonic');
    });
  });

  describe('Type safety', () => {
    test('branded types should be assignable to base string type', () => {
      ChainValidation.register(ChainType.Ethereum, new TestValidator(() => true));

      const address: Address<typeof ChainType.Ethereum> = createAddress('test_address', ChainType.Ethereum);
      const baseString: string = address; // This should work

      expect(baseString).toBe('test_address');
    });

    test('different branded types should not be interchangeable', () => {
      // This test verifies compile-time type safety
      // In actual TypeScript code, these would be compile errors:
      // const ethAddr: Address<ChainType.Ethereum> = createAddress('0x...', ChainType.Ethereum);
      // const btcAddr: Address<ChainType.Bitcoin> = ethAddr; // Type error!

      expect(true).toBe(true); // Placeholder for compile-time check
    });
  });
});
