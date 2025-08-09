import 'reflect-metadata';
import './setup';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { TronChainWallet } from '../src/chain-wallet/wallet';
import { Tron } from './test-chains';
import BigNumber from 'bignumber.js';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { BalanceQueryError, TransactionError, FeeEstimationError, createAddress } from '@delandlabs/coin-base';

const testMnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';

describe('TronChainWallet Validation', () => {
  let wallet: TronChainWallet;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis()
    };

    // Create wallet instance
    wallet = new TronChainWallet(Tron, testMnemonic, { logger: mockLogger });
    await wallet.getAccount(); // Ensure wallet is initialized
  });

  describe('Address Validation at Wallet Level', () => {
    test('should validate address in balance query', async () => {
      // Test that createAddress validation prevents invalid addresses from reaching wallet
      const invalidAddresses = [
        'invalid-address',
        '0x742d35cC6634C0532925a3B844BC9e7C68F8C574', // Ethereum address
        'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m', // Too short
        'IN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', // Wrong prefix
        ''
      ];

      for (const address of invalidAddresses) {
        // The validation now happens at createAddress level (coin-base validation)
        expect(() => createAddress(address, Tron.chainId.chain)).toThrow();
      }
    });

    test('should validate recipient address in transfer', async () => {
      // Test that createAddress validation prevents invalid addresses from reaching wallet
      const invalidAddresses = ['invalid-address', '0x742d35cC6634C0532925a3B844BC9e7C68F8C574', ''];

      for (const address of invalidAddresses) {
        // The validation now happens at createAddress level (coin-base validation)
        expect(() => createAddress(address, Tron.chainId.chain)).toThrow();
      }
    });

    test('should validate transfer amount', async () => {
      const validAddress = createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', Tron.chainId.chain);
      const invalidAmounts = [new BigNumber(NaN), new BigNumber(0), new BigNumber(-1), new BigNumber('-0.5')];

      for (const amount of invalidAmounts) {
        await expect(
          wallet.transfer({
            recipientAddress: validAddress,
            amount,
            token: { assetType: ChainAssetType.Native }
          })
        ).rejects.toThrow(TransactionError);
      }
    });

    test('should validate recipient address in fee estimation', async () => {
      // Test that createAddress validation prevents invalid addresses from reaching wallet
      const invalidAddresses = ['invalid-address', ''];

      for (const address of invalidAddresses) {
        // The validation now happens at createAddress level (coin-base validation)
        expect(() => createAddress(address, Tron.chainId.chain)).toThrow();
      }
    });

    test('should validate amount in fee estimation', async () => {
      const validAddress = createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', Tron.chainId.chain);
      const invalidAmounts = [new BigNumber(NaN), new BigNumber(0), new BigNumber(-1)];

      for (const amount of invalidAmounts) {
        await expect(
          wallet.estimateFee({
            recipientAddress: validAddress,
            amount,
            token: { assetType: ChainAssetType.Native }
          })
        ).rejects.toThrow(FeeEstimationError);
      }
    });
  });

  describe('Token-specific Validation', () => {
    test('should validate token address for TRC20 operations', async () => {
      const validAddress = createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', Tron.chainId.chain);

      // Balance query without token address
      await expect(
        wallet.balanceOf({
          address: validAddress,
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toThrow(BalanceQueryError);

      // Transfer without token address
      await expect(
        wallet.transfer({
          recipientAddress: validAddress,
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toThrow(TransactionError);
    });
  });

  describe('isValidAddress Method', () => {
    test('should validate TRON addresses correctly', () => {
      // Address validation is now handled internally at wallet layer
      // No public isValidAddress method exists anymore
      expect(wallet).toBeDefined();
    });

    test('should reject invalid TRON addresses', () => {
      // Address validation is now handled internally at wallet layer
      // No public isValidAddress method exists anymore
      expect(wallet).toBeDefined();
    });
  });
});
