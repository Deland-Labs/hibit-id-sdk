import { expect, test, describe, vi, beforeEach } from 'vitest';
import { TonNativeHandler } from '../../src/chain-wallet/asset-handlers/ton-native-handler';
import { BaseAssetHandler } from '../../src/chain-wallet/asset-handlers/base-asset-handler';
import { ILogger, NoOpLogger, BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import BigNumber from 'bignumber.js';
import { Address } from '@ton/ton';
import '../setup';

describe('TonNativeHandler', () => {
  let handler: TonNativeHandler;
  let logger: ILogger;
  let mockClient: any;
  let mockWallet: any;
  let mockKeyPair: any;

  beforeEach(() => {
    logger = new NoOpLogger();

    // Mock KeyPair
    mockKeyPair = {
      publicKey: Buffer.from('test-public-key', 'utf8'),
      secretKey: Buffer.from('test-secret-key', 'utf8')
    };

    // Mock TonClient
    mockClient = {
      getBalance: vi.fn(),
      estimateExternalMessageFee: vi.fn()
    };

    // Mock WalletContractV4
    mockWallet = {
      address: {
        toString: () => 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG'
      },
      createTransfer: vi.fn(),
      send: vi.fn(),
      getSeqno: vi.fn().mockResolvedValue(0)
    };

    handler = new TonNativeHandler(mockClient, mockWallet, mockKeyPair, logger);
  });

  describe('constructor', () => {
    test('should create handler with correct dependencies', () => {
      expect(handler).toBeInstanceOf(BaseAssetHandler);
      expect(handler).toBeInstanceOf(TonNativeHandler);
    });
  });

  describe('getAssetType', () => {
    test('should return Native asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.Native);
    });
  });

  // NOTE: supportsMessageSigning and isValidAddress are not part of BaseAssetHandler
  // These methods are wallet-level concerns, not asset handler concerns

  describe('getWalletAddress', () => {
    test('should return wallet address', () => {
      const address = handler.getWalletAddress();
      expect(address).toBe('EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG');
    });
  });

  describe('balanceOf', () => {
    const validParams: BalanceQueryParams = {
      address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' as any,
      token: { assetType: ChainAssetType.Native } as any
    };

    test('should return balance for valid address', async () => {
      const mockBalance = BigInt('1000000000'); // 1 TON in nanotons
      mockClient.getBalance.mockResolvedValue(mockBalance);

      const result = await handler.balanceOf(validParams);

      expect(mockClient.getBalance).toHaveBeenCalledWith(expect.any(Address));
      expect(result).toEqual(new BigNumber('1000000000')); // 1000000000 nanoTON = 1 TON
    });

    test('should throw error for invalid address', async () => {
      const invalidParams: BalanceQueryParams = {
        address: 'invalid-address' as any,
        token: { assetType: ChainAssetType.Native } as any
      };

      // Address validation happens at wallet level now, so handler will throw when trying to parse
      await expect(handler.balanceOf(invalidParams)).rejects.toThrow();
    });

    test('should handle zero balance', async () => {
      mockClient.getBalance.mockResolvedValue(BigInt('0'));

      const result = await handler.balanceOf(validParams);

      expect(result).toEqual(new BigNumber('0'));
    });
  });

  describe('transfer', () => {
    const validParams: TransferParams = {
      recipientAddress: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' as any,
      amount: new BigNumber('0.5'),
      token: { assetType: ChainAssetType.Native } as any
    };

    test('should execute transfer successfully', async () => {
      const mockTransfer = { hash: () => Buffer.from('mock-hash', 'utf8') };
      mockWallet.createTransfer.mockReturnValue(mockTransfer);

      // Mock sequence number changes to simulate confirmed transaction
      let seqno = 0;
      mockClient.open = vi.fn().mockReturnValue({
        send: vi.fn().mockImplementation(() => {
          // Simulate transaction being sent - change seqno immediately
          seqno = 1;
          return Promise.resolve();
        }),
        getSeqno: vi.fn().mockImplementation(() => Promise.resolve(seqno))
      });

      const result = await handler.transfer(validParams);

      expect(mockWallet.createTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          secretKey: mockKeyPair.secretKey,
          seqno: 0,
          sendMode: expect.any(Number),
          messages: expect.any(Array)
        })
      );
      expect(result).toBeDefined();
    });

    test('should throw error for invalid recipient address', async () => {
      const invalidParams: TransferParams = {
        recipientAddress: 'invalid-address' as any,
        amount: new BigNumber('0.5'),
        token: { assetType: ChainAssetType.Native } as any
      };

      // Address validation happens at wallet level now, so handler will throw when trying to parse
      await expect(handler.transfer(invalidParams)).rejects.toThrow();
    });
  });

  describe('estimateFee', () => {
    const validParams: TransferParams = {
      recipientAddress: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' as any,
      amount: new BigNumber('0.5'),
      token: { assetType: ChainAssetType.Native } as any
    };

    test('should return estimated fee', async () => {
      const mockFeeEstimate = {
        source_fees: {
          fwd_fee: 1000000,
          in_fwd_fee: 1000000,
          storage_fee: 1000000,
          gas_fee: 1000000
        }
      };
      mockClient.estimateExternalMessageFee.mockResolvedValue(mockFeeEstimate);

      const result = await handler.estimateFee(validParams);

      expect(mockClient.estimateExternalMessageFee).toHaveBeenCalled();
      expect(result).toBeInstanceOf(BigNumber);
      expect(result.isGreaterThan(0)).toBe(true);
    });

    test('should return default fee when fee estimation fails', async () => {
      // Use different params to avoid cache hit
      const differentParams: TransferParams = {
        recipientAddress: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' as any, // Same as validParams but different amount for cache
        amount: new BigNumber('0.123'), // Different amount to avoid cache
        token: { assetType: ChainAssetType.Native } as any
      };

      // Create fresh handler to avoid mock interference
      const freshMockClient = {
        getBalance: vi.fn(),
        estimateExternalMessageFee: vi.fn().mockResolvedValue(null), // Return null to trigger fallback
        open: vi.fn(),
        isContractDeployed: vi.fn(),
        runMethod: vi.fn(),
        callGetMethod: vi.fn(),
        sendMessage: vi.fn()
      } as any; // TODO: Create proper TonClient mock interface

      const freshHandler = new TonNativeHandler(freshMockClient, mockWallet, mockKeyPair, logger);
      const result = await freshHandler.estimateFee(differentParams);

      // Verify mock was called and returned null
      expect(freshMockClient.estimateExternalMessageFee).toHaveBeenCalled();

      // Should return default gas amount (10000000 nanoTON = 0.01 TON) when estimation fails
      expect(result.toString()).toBe('10000000');
    });

    test('should throw error for invalid recipient address', async () => {
      const invalidParams: TransferParams = {
        recipientAddress: 'invalid-address' as any,
        amount: new BigNumber('0.5'),
        token: { assetType: ChainAssetType.Native } as any
      };

      // Address validation happens at wallet level now, so handler will throw when trying to parse
      await expect(handler.estimateFee(invalidParams)).rejects.toThrow();
    });
  });

  // NOTE: signMessage is not part of BaseAssetHandler
  // Message signing is a wallet-level concern, not asset handler concern
});
