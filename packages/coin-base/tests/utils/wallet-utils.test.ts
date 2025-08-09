import { describe, it, expect, vi } from 'vitest';
import BigNumber from 'bignumber.js';
import {
  validateAddress,
  assertValidAddressForBalance,
  assertValidAddressForTransaction,
  assertValidAddressForFeeEstimation,
  assertValidTransferAmount,
  assertValidAmountForFeeEstimation,
  cleanupReferences,
  createReadyPromise
} from '../../src/utils/wallet-utils';
import { BalanceQueryError, TransactionError, FeeEstimationError, HibitIdSdkErrorCode } from '../../src/types/errors';
import { ChainType } from '@delandlabs/hibit-basic-types';
import { ChainValidation } from '../../src/validation/chain-validation';

describe('wallet-utils', () => {
  // Register test validator
  const testValidator = {
    validateWalletAddress: (addr: string) => addr === 'valid-address',
    validateTokenAddress: (addr: string) => addr === 'valid-token'
  };
  ChainValidation.register(ChainType.Ethereum, testValidator);

  describe('validateAddress', () => {
    it('should return true for valid address', () => {
      const validator = (addr: string) => addr === 'valid-address';
      expect(validateAddress('valid-address', validator)).toBe(true);
    });

    it('should return false for invalid address', () => {
      const validator = (addr: string) => {
        if (addr !== 'valid-address') throw new Error('Invalid');
        return true;
      };
      expect(validateAddress('invalid-address', validator)).toBe(false);
    });
  });

  describe('assertValidAddressForBalance', () => {
    it('should not throw for valid address', () => {
      expect(() => {
        assertValidAddressForBalance('valid-address', ChainType.Ethereum, 'TestChain');
      }).not.toThrow();
    });

    it('should throw BalanceQueryError for invalid address', () => {
      expect(() => {
        assertValidAddressForBalance('invalid-address', ChainType.Ethereum, 'TestChain');
      }).toThrow(BalanceQueryError);
    });

    it('should use correct error code', () => {
      try {
        assertValidAddressForBalance('invalid', ChainType.Ethereum, 'TestChain');
      } catch (error) {
        expect(error).toBeInstanceOf(BalanceQueryError);
        expect((error as BalanceQueryError).code).toBe(HibitIdSdkErrorCode.BALANCE_QUERY_FAILED);
      }
    });
  });

  describe('assertValidAddressForTransaction', () => {
    it('should not throw for valid address', () => {
      expect(() => {
        assertValidAddressForTransaction('valid-address', ChainType.Ethereum, 'TestChain');
      }).not.toThrow();
    });

    it('should throw TransactionError for invalid address', () => {
      expect(() => {
        assertValidAddressForTransaction('invalid', ChainType.Ethereum, 'TestChain');
      }).toThrow(TransactionError);
    });
  });

  describe('assertValidAddressForFeeEstimation', () => {
    it('should not throw for valid address', () => {
      expect(() => {
        assertValidAddressForFeeEstimation('valid-address', ChainType.Ethereum, 'TestChain');
      }).not.toThrow();
    });

    it('should throw FeeEstimationError for invalid address', () => {
      expect(() => {
        assertValidAddressForFeeEstimation('invalid', ChainType.Ethereum, 'TestChain');
      }).toThrow(FeeEstimationError);
    });

    it('should use correct error code (FEE_ESTIMATION_FAILED)', () => {
      try {
        assertValidAddressForFeeEstimation('invalid', ChainType.Ethereum, 'TestChain');
      } catch (error) {
        expect(error).toBeInstanceOf(FeeEstimationError);
        expect((error as FeeEstimationError).code).toBe(HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED);
        expect((error as FeeEstimationError).message).toContain('Invalid recipient address for fee estimation');
      }
    });
  });

  describe('assertValidTransferAmount', () => {
    it('should not throw for valid amount', () => {
      const validAmount = new BigNumber('10');
      expect(() => {
        assertValidTransferAmount(validAmount, 'TestChain');
      }).not.toThrow();
    });

    it('should throw for zero amount', () => {
      const zeroAmount = new BigNumber('0');
      expect(() => {
        assertValidTransferAmount(zeroAmount, 'TestChain');
      }).toThrow(TransactionError);
    });

    it('should throw for negative amount', () => {
      const negativeAmount = new BigNumber('-1');
      expect(() => {
        assertValidTransferAmount(negativeAmount, 'TestChain');
      }).toThrow(TransactionError);
    });
  });

  describe('assertValidAmountForFeeEstimation', () => {
    it('should not throw for valid amount', () => {
      const validAmount = new BigNumber('10');
      expect(() => {
        assertValidAmountForFeeEstimation(validAmount, 'TestChain');
      }).not.toThrow();
    });

    it('should throw FeeEstimationError for invalid amount', () => {
      const invalidAmount = new BigNumber('0');
      expect(() => {
        assertValidAmountForFeeEstimation(invalidAmount, 'TestChain');
      }).toThrow(FeeEstimationError);
    });
  });

  describe('cleanupReferences', () => {
    it('should set specified properties to null', () => {
      const target = {
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3'
      };

      cleanupReferences(target, ['prop1', 'prop3']);

      expect(target.prop1).toBeNull();
      expect(target.prop2).toBe('value2');
      expect(target.prop3).toBeNull();
    });

    it('should handle non-existent properties gracefully', () => {
      const target = { prop1: 'value1' };

      expect(() => {
        cleanupReferences(target, ['prop1', 'nonexistent']);
      }).not.toThrow();

      expect(target.prop1).toBeNull();
    });
  });

  describe('createReadyPromise', () => {
    it('should resolve when init function succeeds', async () => {
      const initFunction = vi.fn().mockResolvedValue(undefined);
      const promise = createReadyPromise(initFunction);

      await expect(promise).resolves.toBeUndefined();
      expect(initFunction).toHaveBeenCalledOnce();
    });

    it('should reject when init function fails', async () => {
      const error = new Error('Initialization failed');
      const initFunction = vi.fn().mockRejectedValue(error);
      const promise = createReadyPromise(initFunction);

      await expect(promise).rejects.toThrow('Initialization failed');
      expect(initFunction).toHaveBeenCalledOnce();
    });

    it('should handle synchronous errors in init function', async () => {
      const initFunction = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const promise = createReadyPromise(initFunction);

      await expect(promise).rejects.toThrow('Sync error');
    });
  });
});
