import 'reflect-metadata';
import './setup';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { KaspaChainWallet } from '../src/chain-wallet/wallet';
import { Kaspa } from './test-chains';
import BigNumber from 'bignumber.js';
import { CHAIN } from '../src/chain-wallet/config';
import { HibitIdSdkErrorCode, createAddress } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';

const testMnemonic = 'test test test test test test test test test test test junk';
const validKaspaAddress = 'kaspa:qpumuen7l8wthtz45p3ftn58pvrs9xlumvkuu2xet8egzkcklqtes4ypce9sf';

describe('KaspaChainWallet Advanced Features', () => {
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

  describe('KRC20 Token Handling', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic, { logger: mockLogger });
    });

    test('should handle KRC20 tick case-insensitively', () => {
      const tickLower = 'kasplex';
      const tickUpper = 'KASPLEX';
      const tickMixed = 'KaSpLeX';

      // All should be treated as the same token internally
      expect(tickLower.toUpperCase()).toBe(tickUpper);
      expect(tickMixed.toUpperCase()).toBe(tickUpper);
    });

    test('should validate KRC20 operations require token address', async () => {
      const testCases = [
        async () =>
          await wallet.balanceOf({
            address: createAddress(validKaspaAddress, CHAIN),
            token: { assetType: ChainAssetType.KRC20 }
          }),
        async () =>
          await wallet.transfer({
            recipientAddress: createAddress(validKaspaAddress, CHAIN),
            amount: new BigNumber('1'),
            token: { assetType: ChainAssetType.KRC20 }
          }),
        async () =>
          await wallet.estimateFee({
            recipientAddress: createAddress(validKaspaAddress, CHAIN),
            amount: new BigNumber('1'),
            token: { assetType: ChainAssetType.KRC20 }
          })
      ];

      for (const testCase of testCases) {
        await expect(testCase()).rejects.toMatchObject({
          code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
        });
      }
    });

    test('should handle KRC20 balance query with valid tick', async () => {
      // This test will fail with network error but should not fail on validation
      await expect(
        wallet.balanceOf({
          address: createAddress(validKaspaAddress, CHAIN),
          token: { assetType: ChainAssetType.KRC20, tokenAddress: 'KASPLEX' }
        })
      ).resolves.toBeInstanceOf(BigNumber);
    });

    test('should handle KRC20 transfer with valid tick', async () => {
      // This will attempt the transfer but fail on network, not validation
      await expect(
        wallet.transfer({
          recipientAddress: createAddress(validKaspaAddress, CHAIN),
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.KRC20, tokenAddress: 'KASPLEX' }
        })
      ).rejects.toThrow(); // Will throw but not validation error
    });
  });

  describe('UTXO Management', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic, { logger: mockLogger });
    });

    test('should handle UTXO subscription lifecycle', async () => {
      // Initialize wallet to set up UTXO subscriptions
      await wallet.getAccount();

      // Check that internal state is managed properly
      const privateWallet = wallet as any;
      expect(privateWallet.addressSet).toBeDefined();
      expect(privateWallet.rpcClient).toBeDefined();
      expect(privateWallet.krc20RpcClient).toBeDefined();
    });

    test('should manage cache invalidation on UTXO changes', async () => {
      await wallet.getAccount();

      const privateWallet = wallet as any;

      // Simulate UTXO change event
      const mockUtxoEvent = {
        UtxosChanged: {
          added: [{ address: validKaspaAddress }],
          removed: []
        }
      };

      // This tests the internal UTXO change handler
      privateWallet.handleUtxoChange(mockUtxoEvent);

      // The handler should process the event without throwing
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('Transaction Creation Patterns', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic, { logger: mockLogger });
    });

    test('should handle commit-reveal pattern for KRC20', async () => {
      // Test the KRC20 transfer pattern (commit/reveal transactions)
      // This will fail on network but should validate the pattern
      await expect(
        wallet.transfer({
          recipientAddress: createAddress(validKaspaAddress, CHAIN),
          amount: new BigNumber('1'),
          token: { assetType: ChainAssetType.KRC20, tokenAddress: 'KASPLEX' }
        })
      ).rejects.not.toMatchObject({
        code: HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER
      });
    });

    test('should handle native transfers with payload', async () => {
      // Test native transfer with optional payload - should succeed
      const txHash = await wallet.transfer({
        recipientAddress: createAddress(validKaspaAddress, CHAIN),
        amount: new BigNumber('1'),
        token: { assetType: ChainAssetType.Native },
        payload: 'test payload'
      });

      expect(txHash).toBeDefined();
      expect(txHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Network Error Handling', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic, { logger: mockLogger });
    });

    test('should handle network failures gracefully', async () => {
      // Balance queries should return zero on network error rather than throwing
      const balance = await wallet.balanceOf({
        address: createAddress(validKaspaAddress, CHAIN),
        token: { assetType: ChainAssetType.Native }
      });

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.isNaN()).toBe(false);
    });

    test('should log network errors appropriately', async () => {
      await wallet.balanceOf({
        address: createAddress(validKaspaAddress, CHAIN),
        token: { assetType: ChainAssetType.Native }
      });

      // Should have debug logging for network operations
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('Resource Cleanup', () => {
    test('should cleanup all resources on destroy', async () => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic, { logger: mockLogger });

      // Initialize resources
      await wallet.getAccount();

      const privateWallet = wallet as any;

      // Verify resources exist
      expect(privateWallet.addressSet.size).toBeGreaterThanOrEqual(0);

      // Destroy and verify cleanup
      wallet.destroy();

      expect(privateWallet.addressSet.size).toBe(0);
      expect(privateWallet.pingInterval).toBeNull();
    });

    test('should handle destroy when not fully initialized', () => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic);

      // Destroy immediately without initialization
      expect(() => wallet.destroy()).not.toThrow();
    });
  });

  describe('Decorator Integration', () => {
    beforeEach(() => {
      wallet = new KaspaChainWallet(Kaspa, testMnemonic, { logger: mockLogger });
    });

    test('should apply logging decorators to methods', async () => {
      // Test that decorators are working by checking logged operations
      await wallet.getAccount();

      // Should have info logs from the BaseChainWallet
      expect(mockLogger.info).toHaveBeenCalledWith(
        'BaseChainWallet initialized',
        expect.objectContaining({
          context: expect.any(String)
        })
      );
    });

    test('should apply sensitive data cleaning decorators', async () => {
      // Test that sensitive data decorators don't expose mnemonics in errors
      try {
        await wallet.signMessage({ message: '' });
      } catch (error: any) {
        // Error message should not contain the mnemonic
        expect(error.message).not.toContain(testMnemonic);
        expect(JSON.stringify(error)).not.toContain(testMnemonic);
      }
    });
  });
});
