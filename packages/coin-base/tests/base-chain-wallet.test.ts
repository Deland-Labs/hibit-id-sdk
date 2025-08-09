import 'reflect-metadata';
import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import BigNumber from 'bignumber.js';
import { BaseChainWallet } from '../src/base-chain-wallet';
import { ChainInfo, Ecosystem } from '../src/types/chain';
import { MnemonicError, HibitIdSdkErrorCode, MessageSigningError, TransactionError } from '../src/types/errors';
import { createAddress } from '../src/types/branded';
import { setupTestValidators, cleanupTestValidators, TEST_ADDRESSES } from './test-validators';
import {
  ChainAccount,
  ChainId,
  ChainType,
  ChainNetwork,
  WalletSignatureSchema,
  ChainAssetType
} from '@delandlabs/hibit-basic-types';
import { SignMessageParams, BalanceQueryParams, TransferParams, TokenIdentifier } from '../src/types/wallet';
import { WalletConfig } from '../src/base-chain-wallet';
import { ConsoleLogger, LogLevel } from '../src/utils/logger';

// Mock implementation for testing abstract class
class MockChainWallet extends BaseChainWallet {
  // IChainWallet interface methods
  async deriveAddress(hdPath: string): Promise<string> {
    return `0x${hdPath.replace(/[^0-9]/g, '')}address`;
  }

  async signTransaction(transaction: any, hdPath: string): Promise<any> {
    return { ...transaction, signature: 'mock-signature', hdPath };
  }

  async sendTransaction(signedTransaction: any): Promise<any> {
    return { ...signedTransaction, hash: '0xmockhash' };
  }

  isValidAddress(address: string): boolean {
    return address.startsWith('0x');
  }

  async getTransaction(txHash: string): Promise<any> {
    return { hash: txHash, status: 'confirmed' };
  }
  constructor(chainInfo: ChainInfo, mnemonicPhrase: string) {
    const config: WalletConfig = {
      chainInfo
    };
    super(config, mnemonicPhrase);
  }

  protected async getAccountImpl(): Promise<ChainAccount> {
    return new ChainAccount(this.chainInfo.chainId, 'mock_address', 'mock_public_key');
  }

  protected async signMessageImpl(params: SignMessageParams): Promise<Uint8Array> {
    const signature = `mock_signature_${params.message}`;
    return new TextEncoder().encode(signature);
  }

  protected async balanceOfImpl(_params: BalanceQueryParams): Promise<BigNumber> {
    return new BigNumber('1000000000');
  }

  protected async transferImpl(params: TransferParams): Promise<string> {
    return `mock_tx_hash_${params.amount}`;
  }

  protected async estimateFeeImpl(_params: TransferParams): Promise<BigNumber> {
    return new BigNumber('100000');
  }

  protected async waitForConfirmationImpl(_params: any): Promise<any> {
    return {
      isConfirmed: true,
      confirmations: 1,
      requiredConfirmations: 1,
      status: 'confirmed',
      blockHash: '0xmockblockhash',
      blockNumber: 1000
    };
  }

  // Track destroy method calls for testing
  public destroyCallCount = 0;
  public isDestroyed = false;

  protected destroyImpl(): void {
    this.destroyCallCount++;
    this.isDestroyed = true;
    // Clear any mock resources
  }

  protected async getAssetDecimalsImpl(_token: any): Promise<number> {
    return 8; // Mock decimal places
  }
}

describe('BaseChainWallet', () => {
  beforeEach(() => {
    setupTestValidators();
  });

  afterEach(() => {
    cleanupTestValidators();
  });

  const validMnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';
  const testChainInfo: ChainInfo = {
    chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumMainNet),
    name: 'Test Chain',
    fullName: 'Test Chain Network',
    icon: '/test-icon.svg',
    nativeAssetSymbol: 'TEST',
    isMainnet: true,
    isNativeGas: true,
    ecosystem: Ecosystem.EVM,
    supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
    explorer: 'https://test-explorer.com',
    rpc: { primary: 'https://test-rpc.com' }
  };

  describe('Constructor', () => {
    test('should create instance with valid parameters', () => {
      const wallet = new MockChainWallet(testChainInfo, validMnemonic);
      expect(wallet.chainInfo).toBe(testChainInfo);
      expect(wallet.chainInfo.name).toBe('Test Chain');
    });

    test('should throw MnemonicError for empty mnemonic', () => {
      expect(() => new MockChainWallet(testChainInfo, '')).toThrow(MnemonicError);
      expect(() => new MockChainWallet(testChainInfo, '   ')).toThrow(MnemonicError);

      try {
        new MockChainWallet(testChainInfo, '');
      } catch (error) {
        expect(error).toBeInstanceOf(MnemonicError);
        expect((error as MnemonicError).code).toBe(HibitIdSdkErrorCode.INVALID_MNEMONIC);
        expect((error as MnemonicError).message).toContain('Mnemonic cannot be empty');
      }
    });

    test('should throw MnemonicError for invalid mnemonic word count', () => {
      const shortMnemonic = 'word1 word2 word3';
      const longMnemonic =
        'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24 word25';

      expect(() => new MockChainWallet(testChainInfo, shortMnemonic)).toThrow(MnemonicError);
      expect(() => new MockChainWallet(testChainInfo, longMnemonic)).toThrow(MnemonicError);

      try {
        new MockChainWallet(testChainInfo, shortMnemonic);
      } catch (error) {
        expect(error).toBeInstanceOf(MnemonicError);
        expect((error as MnemonicError).code).toBe(HibitIdSdkErrorCode.INVALID_MNEMONIC);
        expect((error as MnemonicError).message).toContain('Invalid mnemonic length (got 3 words, expected 12 or 24)');
      }
    });

    test('should accept valid 12-word mnemonic', () => {
      const validMnemonic12 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      expect(() => new MockChainWallet(testChainInfo, validMnemonic12)).not.toThrow();
    });

    test('should accept valid 24-word mnemonic', () => {
      const validMnemonic24 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
      expect(() => new MockChainWallet(testChainInfo, validMnemonic24)).not.toThrow();
    });

    test('should handle mnemonic with extra whitespace', () => {
      const mnemonicWithSpaces = '  eight record heavy smile elephant venue spend burst initial cousin casual order  ';
      expect(() => new MockChainWallet(testChainInfo, mnemonicWithSpaces)).not.toThrow();
    });

    test('should handle mnemonic with multiple spaces between words', () => {
      const mnemonicWithMultipleSpaces =
        'eight  record   heavy    smile elephant venue spend burst initial cousin casual order';
      expect(() => new MockChainWallet(testChainInfo, mnemonicWithMultipleSpaces)).not.toThrow();
    });
  });

  describe('Abstract Methods Implementation', () => {
    let wallet: MockChainWallet;

    beforeEach(() => {
      wallet = new MockChainWallet(testChainInfo, validMnemonic);
    });

    afterEach(() => {
      if (wallet) {
        wallet.destroy();
      }
    });

    test('getAccount should return ChainAccount', async () => {
      const account = await wallet.getAccount();
      expect(account).toBeInstanceOf(ChainAccount);
      expect(account.address).toBe('mock_address');
      expect(account.publicKeyHex).toBe('mock_public_key');
    });

    test('signMessage should return signature as Uint8Array', async () => {
      const params: SignMessageParams = { message: 'test_message' };
      const signature = await wallet.signMessage(params);
      expect(signature).toBeInstanceOf(Uint8Array);
      const signatureString = new TextDecoder().decode(signature);
      expect(signatureString).toBe('mock_signature_test_message');
    });

    test('balanceOf should return BigNumber', async () => {
      const params: BalanceQueryParams = {
        address: createAddress(TEST_ADDRESSES.generic.valid, ChainType.Tron),
        token: {
          assetType: ChainAssetType.Native,
          tokenAddress: undefined
        } as TokenIdentifier
      };
      const balance = await wallet.balanceOf(params);
      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('1000000000');
    });

    test('transfer should return transaction hash', async () => {
      const params: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: new BigNumber('100'),
        token: {
          assetType: ChainAssetType.Native,
          tokenAddress: undefined
        } as TokenIdentifier
      };
      const txHash = await wallet.transfer(params);
      expect(txHash).toBe('mock_tx_hash_100');
    });

    test('estimateFee should return BigNumber', async () => {
      const params: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: new BigNumber('100'),
        token: {
          assetType: ChainAssetType.Native,
          tokenAddress: undefined
        } as TokenIdentifier
      };
      const fee = await wallet.estimateFee(params);
      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.toString()).toBe('100000');
    });
  });

  describe('Memory Management', () => {
    let wallet: MockChainWallet;

    beforeEach(() => {
      wallet = new MockChainWallet(testChainInfo, validMnemonic);
    });

    afterEach(() => {
      if (wallet && !wallet.isDestroyed) {
        wallet.destroy();
      }
    });

    test('destroy should call destroyImpl once', () => {
      expect(wallet.destroyCallCount).toBe(0);
      expect(wallet.isDestroyed).toBe(false);

      wallet.destroy();

      expect(wallet.destroyCallCount).toBe(1);
      expect(wallet.isDestroyed).toBe(true);
    });

    test('destroy should be safe to call multiple times', () => {
      wallet.destroy();
      wallet.destroy();
      wallet.destroy();

      // destroyImpl should be called each time, but implementation should handle it gracefully
      expect(wallet.destroyCallCount).toBe(3);
      expect(wallet.isDestroyed).toBe(true);
    });

    test('destroy should log successful cleanup', () => {
      const logger = new ConsoleLogger(LogLevel.DEBUG, 'DestroyTest');
      (wallet as any).logger = logger;
      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});

      wallet.destroy();

      expect(infoSpy).toHaveBeenCalledWith('BaseChainWallet resources cleaned up', {
        context: 'BaseChainWallet.destroy'
      });
    });

    test('destroy should handle and log errors from destroyImpl', () => {
      class ErrorDestroyWallet extends MockChainWallet {
        protected destroyImpl(): void {
          throw new Error('Cleanup failed');
        }

        protected async waitForConfirmationImpl(params: any): Promise<any> {
          return super.waitForConfirmationImpl(params);
        }
      }

      const errorWallet = new ErrorDestroyWallet(testChainInfo, validMnemonic);
      const logger = new ConsoleLogger(LogLevel.DEBUG, 'DestroyErrorTest');
      (errorWallet as any).logger = logger;
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      // Should not throw
      expect(() => errorWallet.destroy()).not.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        'Error cleaning up BaseChainWallet resources',
        {
          error: expect.any(Error),
          context: 'BaseChainWallet.destroy'
        }
      );
    });

    test('destroyed wallet should still allow basic property access', () => {
      wallet.destroy();

      // Basic properties should still be accessible
      expect(wallet.chainInfo).toBe(testChainInfo);
      expect(wallet.chainInfo.name).toBe('Test Chain');
    });
  });

  describe('Chain Info Access', () => {
    test('should provide access to chain information', () => {
      const wallet = new MockChainWallet(testChainInfo, validMnemonic);

      expect(wallet.chainInfo.name).toBe('Test Chain');
      expect(wallet.chainInfo.fullName).toBe('Test Chain Network');
      expect(wallet.chainInfo.nativeAssetSymbol).toBe('TEST');
      expect(wallet.chainInfo.isMainnet).toBe(true);
      expect(wallet.chainInfo.ecosystem).toBe(Ecosystem.EVM);
    });
  });

  describe('Decorators', () => {
    let wallet: MockChainWallet;
    let logger: ConsoleLogger;
    let logSpy: any;

    beforeEach(() => {
      logger = new ConsoleLogger(LogLevel.DEBUG, 'WalletDecoratorTest');

      // Create wallet with logger
      wallet = new MockChainWallet(testChainInfo, validMnemonic);
      // Manually set logger after construction
      (wallet as any).logger = logger;

      // Spy on logger methods
      logSpy = {
        debug: vi.spyOn(logger, 'debug').mockImplementation(() => {}),
        info: vi.spyOn(logger, 'info').mockImplementation(() => {}),
        error: vi.spyOn(logger, 'error').mockImplementation(() => {})
      };
    });

    afterEach(() => {
      if (wallet) {
        wallet.destroy();
      }
    });

    describe('@withLogging decorator', () => {
      test('should log getAccount operations', async () => {
        const account = await wallet.getAccount();

        expect(account).toBeInstanceOf(ChainAccount);
        expect(logSpy.debug).toHaveBeenCalledWith(
          'Starting Get account information',
          {
            context: 'BaseChainWallet.getAccount',
            data: expect.any(Object)
          }
        );
        expect(logSpy.info).toHaveBeenCalledWith(
          'Get account information successful',
          {
            context: 'BaseChainWallet.getAccount',
            data: expect.objectContaining({
              address: 'mock_address'
            })
          }
        );
      });

      test('should log balanceOf operations', async () => {
        const params: BalanceQueryParams = {
          address: createAddress(TEST_ADDRESSES.generic.valid, ChainType.Tron),
          token: {
            assetType: ChainAssetType.Native
          }
        };
        const balance = await wallet.balanceOf(params);

        expect(balance).toBeInstanceOf(BigNumber);
        expect(logSpy.debug).toHaveBeenCalledWith(
          'Starting Query balance',
          {
            context: 'BaseChainWallet.balanceOf',
            data: expect.objectContaining({
              address: TEST_ADDRESSES.generic.valid,
              token: {
                assetType: ChainAssetType.Native.toString(),
                tokenAddress: undefined,
                symbol: undefined
              }
            })
          }
        );
        expect(logSpy.info).toHaveBeenCalledWith(
          'Query balance successful',
          {
            context: 'BaseChainWallet.balanceOf',
            data: expect.objectContaining({
              balance: '1000000000'
            })
          }
        );
      });

      test('should log transfer operations', async () => {
        const params: TransferParams = {
          recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
          amount: new BigNumber('100'),
          token: {
            assetType: ChainAssetType.Native
          }
        };
        const txHash = await wallet.transfer(params);

        expect(txHash).toBe('mock_tx_hash_100');
        expect(logSpy.debug).toHaveBeenCalledWith(
          'Starting Transfer tokens',
          {
            context: 'BaseChainWallet.transfer',
            data: expect.objectContaining({
              to: TEST_ADDRESSES.generic.recipient,
              amount: '100',
              token: {
                assetType: ChainAssetType.Native.toString(),
                tokenAddress: undefined,
                symbol: undefined
              }
            })
          }
        );
        expect(logSpy.info).toHaveBeenCalledWith(
          'Transfer tokens successful',
          {
            context: 'BaseChainWallet.transfer',
            data: expect.objectContaining({
              txHash: 'mock_tx_hash_100'
            })
          }
        );
      });

      test('should log errors when operations fail', async () => {
        // Create a new MockChainWallet that throws errors
        class ErrorMockWallet extends MockChainWallet {
          protected async transferImpl(_params: TransferParams): Promise<string> {
            throw new Error('Transfer failed');
          }

          protected async waitForConfirmationImpl(params: any): Promise<any> {
            return super.waitForConfirmationImpl(params);
          }
        }

        const errorWallet = new ErrorMockWallet(testChainInfo, validMnemonic);
        (errorWallet as any).logger = logger;

        await expect(
          errorWallet.transfer({
            recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
            amount: new BigNumber('100'),
            token: {
              assetType: ChainAssetType.Native
            }
          })
        ).rejects.toThrow('Transfer failed');

        expect(logSpy.error).toHaveBeenCalledWith(
          'Transfer tokens failed',
          {
            error: expect.any(Error),
            context: 'BaseChainWallet.transfer',
            data: expect.any(Object)
          }
        );
      });
    });

    describe('@cleanSensitiveData decorator', () => {
      test('should clean sensitive data from signMessage errors', async () => {
        class SensitiveErrorWallet extends MockChainWallet {
          protected async signMessageImpl(_params: SignMessageParams): Promise<Uint8Array> {
            throw new Error(
              'Failed to sign with mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
            );
          }

          protected async waitForConfirmationImpl(params: any): Promise<any> {
            return super.waitForConfirmationImpl(params);
          }
        }

        const sensitiveWallet = new SensitiveErrorWallet(testChainInfo, validMnemonic);

        let caughtError: Error | undefined;
        try {
          await sensitiveWallet.signMessage({
            message: 'test message'
          });
        } catch (e) {
          caughtError = e as Error;
        }

        expect(caughtError).toBeDefined();
        // The error is wrapped by withErrorHandling, check the original error message
        const originalError = (caughtError as any).cause || caughtError;
        expect(originalError.message).toContain('[REDACTED]');
        expect(originalError.message).not.toContain('abandon');
      });

      test('should clean sensitive data from transfer errors', async () => {
        class SensitiveErrorWallet extends MockChainWallet {
          protected async transferImpl(_params: TransferParams): Promise<string> {
            throw new Error(
              'Failed with private key: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            );
          }

          protected async waitForConfirmationImpl(params: any): Promise<any> {
            return super.waitForConfirmationImpl(params);
          }
        }

        const sensitiveWallet = new SensitiveErrorWallet(testChainInfo, validMnemonic);

        let caughtError: Error | undefined;
        try {
          await sensitiveWallet.transfer({
            recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
            amount: new BigNumber('100'),
            token: {
              assetType: ChainAssetType.Native
            }
          });
        } catch (e) {
          caughtError = e as Error;
        }

        expect(caughtError).toBeDefined();
        // The error is wrapped by withErrorHandling, check the original error message
        const originalError = (caughtError as any).cause || caughtError;
        expect(originalError.message).toContain('[REDACTED]');
        expect(originalError.message).not.toContain('0x1234567890abcdef');
      });

      test('should clean nested sensitive data', async () => {
        class SensitiveErrorWallet extends MockChainWallet {
          protected async signMessageImpl(_params: SignMessageParams): Promise<Uint8Array> {
            const errorWithDetails = new Error('Signing failed');
            (errorWithDetails as any).privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            (errorWithDetails as any).mnemonic =
              'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            (errorWithDetails as any).details = {
              secret: 'sensitive-secret',
              password: 'my-password'
            };
            throw errorWithDetails;
          }

          protected async waitForConfirmationImpl(params: any): Promise<any> {
            return super.waitForConfirmationImpl(params);
          }
        }

        const sensitiveWallet = new SensitiveErrorWallet(testChainInfo, validMnemonic);

        let caughtError: Error | undefined;
        try {
          await sensitiveWallet.signMessage({
            message: 'test message'
          });
        } catch (e) {
          caughtError = e as Error;
        }

        expect(caughtError).toBeDefined();
        // The error is now wrapped by withErrorHandling decorator
        expect(caughtError).toBeInstanceOf(Error);

        // Check if the error has a cause (original error)
        const walletError = caughtError as any;
        const originalError = walletError.cause || caughtError;

        // Sensitive data should be cleaned in the original error
        expect(originalError.privateKey).toBe('[REDACTED]');
        expect(originalError.mnemonic).toBe('[REDACTED]');
        expect(originalError.details.secret).toBe('[REDACTED]');
        expect(originalError.details.password).toBe('[REDACTED]');
      });
    });

    describe('Decorator interaction', () => {
      test('should both log and clean sensitive data on error', async () => {
        class SensitiveErrorWallet extends MockChainWallet {
          protected async signMessageImpl(_params: SignMessageParams): Promise<Uint8Array> {
            throw new Error(
              'Failed with mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
            );
          }

          protected async waitForConfirmationImpl(params: any): Promise<any> {
            return super.waitForConfirmationImpl(params);
          }
        }

        const sensitiveWallet = new SensitiveErrorWallet(testChainInfo, validMnemonic);
        (sensitiveWallet as any).logger = logger;

        let caughtError: Error | undefined;
        try {
          await sensitiveWallet.signMessage({
            message: 'test message'
          });
        } catch (e) {
          caughtError = e as Error;
        }

        // Check that logging happened
        expect(logSpy.error).toHaveBeenCalledWith(
          'Sign message failed',
          {
            error: expect.any(Error),
            context: 'BaseChainWallet.signMessage',
            data: expect.any(Object)
          }
        );

        // Check that sensitive data was cleaned in the original error
        const originalError = (caughtError as any).cause || caughtError;
        expect(originalError.message).toContain('[REDACTED]');
        expect(originalError.message).not.toContain('abandon');
      });
    });

    describe('@withErrorHandling decorator', () => {
      test('should wrap signMessage errors with MessageSigningError', async () => {
        class ErrorWallet extends MockChainWallet {
          protected async signMessageImpl(_params: SignMessageParams): Promise<Uint8Array> {
            throw new Error('Signing failed');
          }

          protected async waitForConfirmationImpl(params: any): Promise<any> {
            return super.waitForConfirmationImpl(params);
          }
        }

        const errorWallet = new ErrorWallet(testChainInfo, validMnemonic);

        let caughtError: Error | undefined;
        try {
          await errorWallet.signMessage({ message: 'test' });
        } catch (e) {
          caughtError = e as Error;
        }

        expect(caughtError).toBeDefined();
        expect(caughtError).toBeInstanceOf(MessageSigningError);
        expect((caughtError as MessageSigningError).code).toBe(HibitIdSdkErrorCode.MESSAGE_SIGNING_FAILED);
        expect(caughtError!.message).toContain('Test Chain: Failed to sign message');
        expect((caughtError as any).cause.message).toBe('Signing failed');
      });

      test('should wrap transfer errors with TransactionError', async () => {
        class ErrorWallet extends MockChainWallet {
          protected async transferImpl(_params: TransferParams): Promise<string> {
            throw new Error('Transfer failed');
          }

          protected async waitForConfirmationImpl(params: any): Promise<any> {
            return super.waitForConfirmationImpl(params);
          }
        }

        const errorWallet = new ErrorWallet(testChainInfo, validMnemonic);

        let caughtError: Error | undefined;
        try {
          await errorWallet.transfer({
            recipientAddress: createAddress(TEST_ADDRESSES.generic.valid, ChainType.Tron),
            amount: new BigNumber('100'),
            token: { assetType: ChainAssetType.Native }
          });
        } catch (e) {
          caughtError = e as Error;
        }

        expect(caughtError).toBeDefined();
        expect(caughtError).toBeInstanceOf(TransactionError);
        expect((caughtError as TransactionError).code).toBe(HibitIdSdkErrorCode.TRANSACTION_SIGNING_FAILED);
        expect(caughtError!.message).toContain('Test Chain: Failed to transfer tokens');
        expect((caughtError as any).cause.message).toBe('Transfer failed');
      });

      test('should include chain name in error message', async () => {
        class ErrorWallet extends MockChainWallet {
          protected async balanceOfImpl(_params: BalanceQueryParams): Promise<BigNumber> {
            throw new Error('RPC error');
          }

          protected async waitForConfirmationImpl(params: any): Promise<any> {
            return super.waitForConfirmationImpl(params);
          }
        }

        const errorWallet = new ErrorWallet(testChainInfo, validMnemonic);

        try {
          await errorWallet.balanceOf({
            address: createAddress(TEST_ADDRESSES.generic.valid, ChainType.Tron),
            token: { assetType: ChainAssetType.Native }
          });
        } catch (e) {
          const error = e as Error;
          expect(error.message).toContain('Test Chain:');
          expect(error.message).toContain('Failed to query balance');
        }
      });
    });
  });
});
