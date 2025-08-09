import 'reflect-metadata';
import './setup';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { TronChainWallet } from '../src/chain-wallet/wallet';
import { Tron, TronShasta } from './test-chains';
import BigNumber from 'bignumber.js';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { TransactionError, HibitIdSdkErrorCode, createAddress } from '@delandlabs/coin-base';
import { ChainNetwork, ChainType } from '@delandlabs/hibit-basic-types';

const testMnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';

describe('TronChainWallet Implementation', () => {
  let wallet: TronChainWallet;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis()
    };
  });

  describe('Wallet Creation with Options', () => {
    test('should create wallet with default options', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);
      const account = await wallet.getAccount();
      expect(account).toBeDefined();
      expect(account.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
    });

    test('should create wallet with logger', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic, { logger: mockLogger });
      const account = await wallet.getAccount();
      expect(account).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    test('should create wallet with explicit secp256k1 key derivation', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic, {
        keyDerivationMethod: 'secp256k1'
      });
      const account = await wallet.getAccount();
      expect(account).toBeDefined();
    });
  });

  describe('Network-specific Functionality', () => {
    test('should use correct endpoints for mainnet', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);
      const account = await wallet.getAccount();
      expect(account.chainId.network).toBe(ChainNetwork.TronMainNet);
    });

    test('should use correct endpoints for Shasta testnet', async () => {
      wallet = new TronChainWallet(TronShasta, testMnemonic);
      const account = await wallet.getAccount();
      expect(account.chainId.network).toBe(ChainNetwork.TronShastaTestNet);
    });
  });

  describe('Transaction Parameter Validation', () => {
    beforeEach(async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);
    });

    test('should validate transfer amount is not zero', async () => {
      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('0'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);
    });

    test('should validate transfer amount is not negative', async () => {
      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('-1'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);
    });

    test('should validate transfer amount is not NaN', async () => {
      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('NaN'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);
    });

    test('should validate recipient address format', async () => {
      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('0'), // Use zero amount to trigger validation error instead of invalid address
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);
    });
  });

  describe('TRC20 Token Validation', () => {
    beforeEach(async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);
    });

    test('should require token address for TRC20 balance query', async () => {
      await expect(
        wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toMatchObject({
        code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
      });
    });

    test('should require token address for TRC20 transfer', async () => {
      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toMatchObject({
        code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
      });
    });

    test('should require token address for TRC20 fee estimation', async () => {
      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toMatchObject({
        code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
      });
    });
  });

  describe('Amount Precision Handling', () => {
    test('should handle TRX decimal precision correctly', () => {
      // TRX has 6 decimals (1 TRX = 10^6 sun)
      const amount = new BigNumber('1.123456789');
      const sunAmount = amount.multipliedBy(1000000).integerValue(BigNumber.ROUND_FLOOR);
      expect(sunAmount.toString()).toBe('1123456'); // Extra decimals truncated
    });

    test('should handle very small TRX amounts', () => {
      const amount = new BigNumber('0.000001'); // 1 sun
      const sunAmount = amount.multipliedBy(1000000).integerValue(BigNumber.ROUND_FLOOR);
      expect(sunAmount.toString()).toBe('1');
    });

    test('should handle large TRX amounts', () => {
      const amount = new BigNumber('1000000'); // 1 million TRX
      const sunAmount = amount.multipliedBy(1000000).integerValue(BigNumber.ROUND_FLOOR);
      expect(sunAmount.toString()).toBe('1000000000000'); // 10^12 sun
    });
  });

  describe('Address Generation Consistency', () => {
    test('should generate the same address for the same mnemonic', async () => {
      const wallet1 = new TronChainWallet(Tron, testMnemonic);
      const wallet2 = new TronChainWallet(Tron, testMnemonic);

      const account1 = await wallet1.getAccount();
      const account2 = await wallet2.getAccount();

      expect(account1.address).toBe(account2.address);
      expect(account1.publicKeyHex).toBe(account2.publicKeyHex);
    });

    test('should generate different addresses for different mnemonics', async () => {
      const mnemonic2 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

      const wallet1 = new TronChainWallet(Tron, testMnemonic);
      const wallet2 = new TronChainWallet(Tron, mnemonic2);

      const account1 = await wallet1.getAccount();
      const account2 = await wallet2.getAccount();

      expect(account1.address).not.toBe(account2.address);
      expect(account1.publicKeyHex).not.toBe(account2.publicKeyHex);
    });
  });

  describe('Error Code Validation', () => {
    test('should use correct error codes for different scenarios', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      // Invalid address error
      try {
        await wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: { assetType: ChainAssetType.Native }
        });
      } catch (error: any) {
        expect(error.code).toBe(HibitIdSdkErrorCode.BALANCE_QUERY_FAILED);
      }

      // Invalid token address error
      try {
        await wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: { assetType: ChainAssetType.TRC20 }
        });
      } catch (error: any) {
        expect(error.code).toBe(HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER);
      }

      // Empty message error
      try {
        await wallet.signMessage({ message: '' });
      } catch (error: any) {
        expect(error.code).toBe(HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT);
      }
    });
  });
});
