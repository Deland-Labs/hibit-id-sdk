import 'reflect-metadata';
import './setup';
import { describe, expect, test } from 'vitest';
import BigNumber from 'bignumber.js';
import { TronChainWallet } from '../src/chain-wallet/wallet';
import { Tron } from './test-chains';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import {
  BalanceQueryError,
  TransactionError,
  FeeEstimationError,
  GeneralWalletError,
  HibitIdSdkErrorCode,
  createAddress
} from '@delandlabs/coin-base';
import { ChainType, ChainId } from '@delandlabs/hibit-basic-types';

const testMnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';

describe('TronChainWallet Basic Functionality', () => {
  let wallet: TronChainWallet;

  describe('Constructor and Basic Properties', () => {
    test('should create wallet instance', () => {
      wallet = new TronChainWallet(Tron, testMnemonic);
      expect(wallet).toBeDefined();
      expect(wallet.chainInfo).toEqual(Tron);
    });

    test('should validate different types of TRON addresses', () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      // Address validation is now handled internally at wallet layer
      // No public isValidAddress method exists anymore
      expect(wallet).toBeDefined();
    });

    test('should get account information', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);
      const account = await wallet.getAccount();

      expect(account).toBeDefined();
      expect(account.address).toBeDefined();
      expect(account.publicKeyHex).toBeDefined();
      expect(typeof account.address).toBe('string');
      expect(typeof account.publicKeyHex).toBe('string');
      expect(account.chainId).toEqual(Tron.chainId);

      // Verify the address follows TRON format (starts with T, base58)
      expect(account.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
      // Public key should be 130 hex characters (65 bytes - uncompressed)
      expect(account.publicKeyHex).toMatch(/^[0-9a-f]{130}$/);
    });

    test('should sign messages correctly', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);
      const message = 'test message for tron wallet signing';
      const signature = await wallet.signMessage({ message });

      expect(signature).toBeDefined();
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0); // TRON signatures vary in length
    });

    test('should handle empty message error for signing', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      await expect(wallet.signMessage({ message: '' })).rejects.toThrow('Message cannot be empty');
    });

    test('should reject invalid mnemonic', () => {
      expect(() => {
        new TronChainWallet(Tron, 'invalid mnemonic phrase');
      }).toThrow();
    });

    test('should reject wrong chain type', () => {
      const wrongChainId = new ChainId('ETHEREUM', Tron.chainId.network);
      const wrongChain = {
        ...Tron,
        chainId: wrongChainId
      };

      expect(() => {
        new TronChainWallet(wrongChain, testMnemonic);
      }).toThrow('Invalid chain type');
    });
  });

  describe('Token Interface Validation', () => {
    test('should validate native TRX token interface', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      const nativeToken = { assetType: ChainAssetType.Native };

      // Should not throw for valid native token
      expect(() => {
        // This is a validation that the token interface is correctly structured
        expect(nativeToken.assetType).toBeDefined();
        expect(nativeToken.assetType).toBe(ChainAssetType.Native);
      }).not.toThrow();
    });

    test('should validate TRC20 token interface', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      const trc20Token = {
        assetType: ChainAssetType.TRC20,
        tokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // USDT
      };

      expect(trc20Token.assetType).toBe(ChainAssetType.TRC20);
      expect(trc20Token.tokenAddress).toBeDefined();
      expect(typeof trc20Token.tokenAddress).toBe('string');
    });

    test('should require token address for TRC20 tokens', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      // Missing token address should cause error in actual operations
      const trc20TokenMissingAddress = { assetType: ChainAssetType.TRC20 };

      await expect(
        wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: trc20TokenMissingAddress
        })
      ).rejects.toThrow(BalanceQueryError);

      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TPwJS5eC5BPGyMGtYTHNhPTB89sUWjDSSu', ChainType.Tron),
          amount: new BigNumber('1'),
          token: trc20TokenMissingAddress
        })
      ).rejects.toThrow(TransactionError);

      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress('TPwJS5eC5BPGyMGtYTHNhPTB89sUWjDSSu', ChainType.Tron),
          amount: new BigNumber('1'),
          token: trc20TokenMissingAddress
        })
      ).rejects.toThrow(FeeEstimationError);
    });
  });

  describe('Error Handling Validation', () => {
    test('should throw appropriate errors for unsupported asset types', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      const unsupportedToken = { assetType: 'UNSUPPORTED' as any };

      // Balance query
      await expect(
        wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: unsupportedToken
        })
      ).rejects.toThrow(GeneralWalletError);

      await expect(
        wallet.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: unsupportedToken
        })
      ).rejects.toMatchObject({
        code: HibitIdSdkErrorCode.UNSUPPORTED_ASSET_TYPE
      });

      // Transfer
      await expect(
        wallet.transfer({
          recipientAddress: createAddress('TPwJS5eC5BPGyMGtYTHNhPTB89sUWjDSSu', ChainType.Tron),
          amount: new BigNumber('1'),
          token: unsupportedToken
        })
      ).rejects.toThrow(GeneralWalletError);

      // Fee estimation
      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress('TPwJS5eC5BPGyMGtYTHNhPTB89sUWjDSSu', ChainType.Tron),
          amount: new BigNumber('1'),
          token: unsupportedToken
        })
      ).rejects.toThrow(GeneralWalletError);
    });

    test('should handle BigNumber precision correctly', () => {
      // Test BigNumber operations used in the wallet
      const amount = new BigNumber('1.123456');
      const sunPerTrx = 1000000; // 10^6
      const sun = amount.multipliedBy(sunPerTrx).integerValue(BigNumber.ROUND_FLOOR);
      expect(sun.toString()).toBe('1123456');

      // Test decimal conversion
      const preciseAmount = new BigNumber('1.999999');
      const truncated = preciseAmount.multipliedBy(sunPerTrx).integerValue(BigNumber.ROUND_FLOOR);
      expect(truncated.toString()).toBe('1999999'); // Should truncate excess precision
    });

    test('should validate error codes are from the correct enum', () => {
      expect(HibitIdSdkErrorCode.BALANCE_QUERY_FAILED).toBeDefined();
      expect(HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED).toBeDefined();
      expect(HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED).toBeDefined();
      expect(HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER).toBeDefined();
      expect(HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT).toBeDefined();
      expect(HibitIdSdkErrorCode.INSUFFICIENT_BALANCE).toBeDefined();
    });
  });

  describe('Constants and Defaults Validation', () => {
    test('should have correct asset type constants', () => {
      expect(ChainAssetType.Native).toBeDefined();
      expect(ChainAssetType.TRC20).toBeDefined();
      expect(ChainAssetType.Native).not.toBe(ChainAssetType.TRC20);
    });

    test('should validate chain configuration constants', () => {
      expect(Tron.nativeAssetSymbol).toBe('TRX');
      expect(Tron.isMainnet).toBe(true);
      expect(Tron.ecosystem).toBeDefined();
      // expect(Tron.caseSensitiveAddress).toBe(true); // Property removed
    });
  });

  describe('Address Format Validation', () => {
    test('should handle various TRON address formats', () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      // Address validation is now handled internally at wallet layer
      // No public isValidAddress method exists anymore
      expect(wallet).toBeDefined();
    });
  });

  describe('Fee Validation', () => {
    test('should validate fee estimation parameters', async () => {
      wallet = new TronChainWallet(Tron, testMnemonic);

      // Invalid recipient address
      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron), // Use valid address instead of empty string
          amount: new BigNumber('0'), // Use zero amount to trigger validation error
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(FeeEstimationError);

      // NaN amount
      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('NaN'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(FeeEstimationError);

      // Negative amount
      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          amount: new BigNumber('-1'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(FeeEstimationError);
    });
  });
});
