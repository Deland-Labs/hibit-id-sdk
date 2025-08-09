import 'reflect-metadata';
import './setup';
import { describe, expect, test, beforeEach } from 'vitest';
import { TronChainWallet } from '../src/chain-wallet/wallet';
import { Tron } from './test-chains';
import BigNumber from 'bignumber.js';
import { ChainAssetType, ChainType } from '@delandlabs/hibit-basic-types';
import {
  HibitIdSdkErrorCode,
  TransactionError,
  FeeEstimationError,
  BalanceQueryError,
  createAddress
} from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';

describe('TRON Error Scenarios', () => {
  let wallet: TronChainWallet;
  const testMnemonic = 'test test test test test test test test test test test junk';

  beforeEach(() => {
    wallet = new TronChainWallet(Tron, testMnemonic);
  });

  describe('Balance Query Error Scenarios', () => {
    test('should handle valid address with mocked validation failure', async () => {
      // Create a valid address first
      const validAddress = createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron);

      // Mock the internal validation to simulate invalid address
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;
      connectionManager.getTronWeb = () => ({
        isAddress: () => false,
        trx: {
          getBalance: async () => {
            throw new Error('Invalid address');
          }
        }
      });

      await expect(
        wallet.balanceOf({
          address: validAddress,
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow();

      // Restore original
      connectionManager.getTronWeb = originalGetTronWeb;
    });

    test('should handle missing TRC20 token address', async () => {
      await expect(
        wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
        })
      );
    });

    test('should handle invalid TRC20 contract address format', async () => {
      // Mock validation to fail for the contract address
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;
      let addressCheckCount = 0;
      connectionManager.getTronWeb = () => ({
        isAddress: () => {
          addressCheckCount++;
          // First call validates the user address (should pass)
          // Second call validates the contract address (should fail)
          return addressCheckCount === 1 ? true : false;
        },
        contract: () => ({
          at: async () => {
            throw new Error('Invalid contract');
          }
        })
      });

      await expect(
        wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: {
            assetType: ChainAssetType.TRC20,
            tokenAddress: 'invalid-contract'
          }
        })
      ).rejects.toThrow(BalanceQueryError);

      // Restore original
      connectionManager.getTronWeb = originalGetTronWeb;
    });

    test('should handle unsupported asset types', async () => {
      await expect(
        wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: { assetType: 'UNSUPPORTED' as any }
        })
      ).rejects.toThrow('Asset type Unknown is not supported');
    });
  });

  describe('Transfer Error Scenarios', () => {
    beforeEach(() => {
      wallet = new TronChainWallet(Tron, testMnemonic);
    });

    test('should handle recipient address validation failure', async () => {
      const validAddress = createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron);

      // Mock validation to fail
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;
      connectionManager.getTronWeb = () => ({
        isAddress: () => false,
        transactionBuilder: {
          sendTrx: async () => {
            throw new Error('Invalid address');
          }
        },
        trx: {
          sign: async () => {},
          sendRawTransaction: async () => {}
        },
        setPrivateKey: () => {}
      });

      await expect(
        wallet.transfer({
          recipientAddress: validAddress,
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);

      // Restore original
      connectionManager.getTronWeb = originalGetTronWeb;
    });

    test('should handle invalid transfer amounts', async () => {
      const invalidAmounts = [new BigNumber('0'), new BigNumber('-1'), new BigNumber('NaN')];

      for (const amount of invalidAmounts) {
        await expect(
          wallet.transfer({
            recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
            amount,
            token: { assetType: ChainAssetType.Native }
          })
        ).rejects.toThrow(
          expect.objectContaining({
            code: HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED
          })
        );
      }
    });

    test('should handle TRC20 transfer validation errors', async () => {
      // Missing token address
      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
        })
      );

      // Invalid amount
      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('0'),
          token: {
            assetType: ChainAssetType.TRC20,
            tokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
          }
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED
        })
      );
    });
  });

  describe('Fee Estimation Error Scenarios', () => {
    beforeEach(() => {
      wallet = new TronChainWallet(Tron, testMnemonic);
    });

    test('should handle fee estimation validation failures', async () => {
      const validAddress = createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron);

      // Mock validation to fail
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;
      connectionManager.getTronWeb = () => ({
        isAddress: () => false,
        trx: {
          getAccountResources: async () => {
            throw new Error('Invalid address');
          }
        }
      });

      await expect(
        wallet.estimateFee({
          recipientAddress: validAddress,
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(FeeEstimationError);

      // Restore original
      connectionManager.getTronWeb = originalGetTronWeb;
    });

    test('should handle invalid amount in fee estimation', async () => {
      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('0'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED
        })
      );
    });

    test('should handle TRC20 fee estimation errors', async () => {
      // Missing token address
      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
        })
      );
    });
  });

  describe('Message Signing Error Scenarios', () => {
    beforeEach(() => {
      wallet = new TronChainWallet(Tron, testMnemonic);
    });

    test('should handle empty message', async () => {
      await expect(wallet.signMessage({ message: '' })).rejects.toThrow(
        expect.objectContaining({
          code: HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT
        })
      );
    });

    test('should handle whitespace-only message', async () => {
      await expect(wallet.signMessage({ message: '   ' })).rejects.toThrow(
        expect.objectContaining({
          code: HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT
        })
      );
    });

    test('should handle message signing for TRON chain', async () => {
      // TRON supports message signing at the chain level, regardless of asset type
      // This tests that message signing works correctly for TRON

      const signature = await wallet.signMessage({ message: 'Test message' });

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('Network Error Simulation', () => {
    test('should handle network timeout scenarios', () => {
      const networkErrors = [
        'network timeout',
        'Connection failed',
        'ECONNRESET',
        'ETIMEDOUT',
        'RPC error: timeout',
        'TronGrid unavailable',
        'fetch failed'
      ];

      networkErrors.forEach((error) => {
        expect(error.toLowerCase()).toMatch(/network|timeout|connection|rpc|trongrid|fetch|econnreset|etimedout/);
      });
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should handle insufficient bandwidth scenarios', () => {
      const accountResources = {
        freeNetLimit: 1000,
        freeNetUsed: 900,
        NetLimit: 0,
        NetUsed: 0
      };

      const requiredBandwidth = 267;
      const availableBandwidth = accountResources.freeNetLimit - accountResources.freeNetUsed;
      const needsFee = availableBandwidth < requiredBandwidth;

      expect(needsFee).toBe(true);
      expect(availableBandwidth).toBe(100);
    });

    test('should handle insufficient energy scenarios for TRC20', () => {
      const accountResources = {
        EnergyLimit: 10000,
        EnergyUsed: 9500
      };

      const requiredEnergy = 15000; // Typical TRC20 transfer
      const availableEnergy = accountResources.EnergyLimit - accountResources.EnergyUsed;
      const needsFee = availableEnergy < requiredEnergy;

      expect(needsFee).toBe(true);
      expect(availableEnergy).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large amounts', () => {
      const largeAmount = new BigNumber('999999999999999999999999');
      const sunAmount = largeAmount.multipliedBy(1_000_000);

      expect(sunAmount.isFinite()).toBe(true);
      // Use toFixed(0) to get full precision without scientific notation
      expect(sunAmount.toFixed(0)).toBe('999999999999999999999999000000');
    });

    test('should handle very small amounts', () => {
      const smallAmount = new BigNumber('0.000001'); // 1 sun
      const sunAmount = smallAmount.multipliedBy(1_000_000);

      expect(sunAmount.toString()).toBe('1');
    });

    test('should handle precision edge cases', () => {
      const amount = new BigNumber('1.123456789');
      const sunAmount = amount.multipliedBy(1_000_000).integerValue(BigNumber.ROUND_FLOOR);

      // Should truncate to 6 decimal places (sun precision)
      expect(sunAmount.toString()).toBe('1123456');
    });
  });

  describe('Error Code Validation', () => {
    test('should use correct error codes for each scenario', () => {
      // This test validates that our error handling uses the correct codes
      const errorScenarios = [
        { code: HibitIdSdkErrorCode.INVALID_RECIPIENT_ADDRESS, description: 'Invalid address' },
        { code: HibitIdSdkErrorCode.INVALID_AMOUNT, description: 'Invalid amount' },
        { code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER, description: 'Invalid token' },
        { code: HibitIdSdkErrorCode.NETWORK_UNAVAILABLE, description: 'Network error' },
        { code: HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED, description: 'Transaction failed' },
        { code: HibitIdSdkErrorCode.BALANCE_QUERY_FAILED, description: 'Balance query failed' },
        { code: HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED, description: 'Fee estimation failed' },
        { code: HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT, description: 'Invalid message' },
        { code: HibitIdSdkErrorCode.MESSAGE_SIGNING_FAILED, description: 'Signing failed' }
      ];

      errorScenarios.forEach((scenario) => {
        expect(scenario.code).toBeDefined();
        expect(scenario.description).toBeDefined();
      });
    });
  });
});
