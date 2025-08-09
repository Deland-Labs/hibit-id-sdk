import 'reflect-metadata';
import './setup';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { KaspaChainWallet } from '../src/chain-wallet/wallet';
import { Kaspa, KaspaTestnet } from './test-chains';
import BigNumber from 'bignumber.js';
import { CHAIN } from '../src/chain-wallet/config';
import {
  TransactionError,
  BalanceQueryError,
  FeeEstimationError,
  MessageSigningError,
  NetworkError,
  MnemonicError,
  HibitIdSdkErrorCode,
  createAddress
} from '@delandlabs/coin-base';
import { ChainNetwork, ChainId, ChainType, ChainAssetType } from '@delandlabs/hibit-basic-types';

const testMnemonic = 'test test test test test test test test test test test junk';
const validKaspaAddress = 'kaspa:qpumuen7l8wthtz45p3ftn58pvrs9xlumvkuu2xet8egzkcklqtes4ypce9sf';

describe('KaspaChainWallet', () => {
  let wallet: KaspaChainWallet;
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

  afterEach(() => {
    if (wallet) {
      wallet.destroy();
    }
  });

  describe('Constructor', () => {
    test('should create wallet with valid chain info', async () => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic);
      const account = await wallet.getAccount();
      expect(account).toBeDefined();
      expect(account.address).toMatch(/^kaspa:[a-z0-9]{61,}$/);
    });

    test('should create wallet with logger option', async () => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic, { logger: mockLogger });
      const account = await wallet.getAccount();
      expect(account).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should throw error for invalid chain type', () => {
      const invalidChainId = new ChainId(ChainType.Bitcoin, ChainNetwork.KaspaMainNet);
      const invalidChainInfo = {
        ...Kaspa,
        chainId: invalidChainId
      };

      expect(() => new KaspaChainWallet(invalidChainInfo, testMnemonic)).toThrow(NetworkError);
    });

    test('should throw error for empty mnemonic', () => {
      expect(() => new KaspaChainWallet(Kaspa, '')).toThrow(MnemonicError);
    });
  });

  describe('Account Management', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic);
    });

    test('should return correct account for mainnet', async () => {
      const account = await wallet.getAccount();
      expect(account.chainId.chain).toBe(ChainType.Kaspa);
      expect(account.chainId.network).toBe(ChainNetwork.KaspaMainNet);
      expect(account.address).toMatch(/^kaspa:[a-z0-9]{61,}$/);
      expect(account.publicKeyHex).toMatch(/^[a-f0-9]{66}$/);
    });

    test('should return correct account for testnet', async () => {
      wallet.destroy();
      wallet = new KaspaChainWallet(KaspaTestnet, testMnemonic);
      const account = await wallet.getAccount();
      expect(account.chainId.network).toBe(ChainNetwork.KaspaTestNet);
    });

    test('should generate consistent addresses', async () => {
      const wallet2 = new KaspaChainWallet(Kaspa, testMnemonic);
      const account1 = await wallet.getAccount();
      const account2 = await wallet2.getAccount();

      expect(account1.address).toBe(account2.address);
      expect(account1.publicKeyHex).toBe(account2.publicKeyHex);

      wallet2.destroy();
    });
  });

  describe('Address Validation', () => {
    test('should validate correct Kaspa addresses', () => {
      // Address validation is now handled by ChainValidation at wallet layer
      expect(() => createAddress(validKaspaAddress, ChainType.Kaspa)).not.toThrow();
    });

    test('should reject invalid addresses', () => {
      expect(() => createAddress('invalid', ChainType.Kaspa)).toThrow();
      expect(() => createAddress('', ChainType.Kaspa)).toThrow();
      expect(() => createAddress('bitcoin:1234', ChainType.Kaspa)).toThrow();
    });
  });

  describe('Message Signing', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic);
    });

    test('should sign message successfully', async () => {
      const signature = await wallet.signMessage({ message: 'Hello World' });
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
    });

    test('should throw error for empty message', async () => {
      await expect(wallet.signMessage({ message: '' })).rejects.toThrow(MessageSigningError);
    });

    test('should produce different signatures for different messages', async () => {
      const sig1 = await wallet.signMessage({ message: 'message1' });
      const sig2 = await wallet.signMessage({ message: 'message2' });
      expect(sig1).not.toEqual(sig2);
    });
  });

  describe('Balance Queries', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic);
    });

    test('should handle native balance query', async () => {
      const balance = await wallet.balanceOf({
        address: createAddress(validKaspaAddress, CHAIN),
        token: { assetType: ChainAssetType.Native }
      });
      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.isNaN()).toBe(false);
    });

    test('should throw error for invalid address in balance query', async () => {
      await expect(
        wallet.balanceOf({
          address: 'invalid' as any,
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(BalanceQueryError);
    });

    test('should require token address for KRC20 balance query', async () => {
      await expect(
        wallet.balanceOf({
          address: createAddress(validKaspaAddress, CHAIN),
          token: { assetType: ChainAssetType.KRC20 }
        })
      ).rejects.toMatchObject({
        code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
      });
    });
  });

  describe('Transfer Validation', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic);
    });

    test('should validate transfer amount is positive', async () => {
      await expect(
        wallet.transfer({
          recipientAddress: createAddress(validKaspaAddress, CHAIN),
          amount: new BigNumber('0'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);

      await expect(
        wallet.transfer({
          recipientAddress: createAddress(validKaspaAddress, CHAIN),
          amount: new BigNumber('-1'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);

      await expect(
        wallet.transfer({
          recipientAddress: createAddress(validKaspaAddress, CHAIN),
          amount: new BigNumber('NaN'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);
    });

    test('should validate recipient address', async () => {
      await expect(
        wallet.transfer({
          recipientAddress: 'invalid' as any,
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(TransactionError);
    });

    test('should require token address for KRC20 transfer', async () => {
      await expect(
        wallet.transfer({
          recipientAddress: createAddress(validKaspaAddress, CHAIN),
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.KRC20 }
        })
      ).rejects.toMatchObject({
        code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
      });
    });
  });

  describe('Fee Estimation', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic);
    });

    test('should estimate native transfer fee', async () => {
      const fee = await wallet.estimateFee({
        recipientAddress: createAddress(validKaspaAddress, CHAIN),
        amount: new BigNumber('1'),
        token: { assetType: ChainAssetType.Native }
      });
      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.isPositive()).toBe(true);
    });

    test('should validate fee estimation parameters', async () => {
      await expect(
        wallet.estimateFee({
          recipientAddress: 'invalid' as any,
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(FeeEstimationError);

      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress(validKaspaAddress, CHAIN),
          amount: new BigNumber('0'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow(FeeEstimationError);
    });

    test('should require token address for KRC20 fee estimation', async () => {
      await expect(
        wallet.estimateFee({
          recipientAddress: createAddress(validKaspaAddress, CHAIN),
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.KRC20 }
        })
      ).rejects.toMatchObject({
        code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
      });
    });
  });

  describe('Precision Handling', () => {
    test('should handle KAS decimal precision correctly', () => {
      // KAS has 8 decimals (1 KAS = 10^8 sompi)
      const amount = new BigNumber('1.12345678');
      const sompiAmount = amount.multipliedBy(100000000).integerValue(BigNumber.ROUND_FLOOR);
      expect(sompiAmount.toString()).toBe('112345678');
    });

    test('should handle very small amounts', () => {
      const amount = new BigNumber('0.00000001'); // 1 sompi
      const sompiAmount = amount.multipliedBy(100000000).integerValue(BigNumber.ROUND_FLOOR);
      expect(sompiAmount.toString()).toBe('1');
    });

    test('should handle large amounts', () => {
      const amount = new BigNumber('1000000'); // 1 million KAS
      const sompiAmount = amount.multipliedBy(100000000).integerValue(BigNumber.ROUND_FLOOR);
      expect(sompiAmount.toString()).toBe('100000000000000'); // 10^14 sompi
    });
  });

  describe('Deterministic Address Generation', () => {
    test('should generate consistent addresses for same mnemonic', async () => {
      const wallet1 = new KaspaChainWallet(Kaspa, testMnemonic);
      const wallet2 = new KaspaChainWallet(Kaspa, testMnemonic);

      const account1 = await wallet1.getAccount();
      const account2 = await wallet2.getAccount();

      expect(account1.address).toBe(account2.address);
      expect(account1.publicKeyHex).toBe(account2.publicKeyHex);

      wallet1.destroy();
      wallet2.destroy();
    });

    test('should generate different addresses for different mnemonics', async () => {
      const mnemonic2 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const wallet1 = new KaspaChainWallet(Kaspa, testMnemonic);
      const wallet2 = new KaspaChainWallet(Kaspa, mnemonic2);

      const account1 = await wallet1.getAccount();
      const account2 = await wallet2.getAccount();

      expect(account1.address).not.toBe(account2.address);
      expect(account1.publicKeyHex).not.toBe(account2.publicKeyHex);

      wallet1.destroy();
      wallet2.destroy();
    });
  });
});
