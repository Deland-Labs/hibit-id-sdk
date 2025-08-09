import { expect, test, describe, vi, beforeEach } from 'vitest';
import { BaseAssetHandler } from '../../src/chain-wallet/asset-handlers/base-asset-handler';
import { ILogger, NoOpLogger, BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import BigNumber from 'bignumber.js';
import '../setup';

// Concrete implementation for testing
class TestAssetHandler extends BaseAssetHandler {
  async balanceOf(_params: BalanceQueryParams): Promise<BigNumber> {
    return new BigNumber('1');
  }

  async transfer(_params: TransferParams): Promise<string> {
    return 'test-hash';
  }

  async estimateFee(_params: TransferParams): Promise<BigNumber> {
    return new BigNumber('0.01');
  }

  getAssetType(): ChainAssetType {
    return ChainAssetType.Native;
  }

  protected async waitForConfirmation(_initialSeqno: number): Promise<void> {
    // Test implementation
  }
}

describe('BaseAssetHandler', () => {
  let handler: TestAssetHandler;
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
      getBalance: vi.fn()
    };

    // Mock WalletContractV4
    mockWallet = {
      address: {
        toString: () => 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG'
      }
    };

    handler = new TestAssetHandler(mockClient, mockWallet, mockKeyPair, logger);
  });

  describe('constructor', () => {
    test('should create handler with injected dependencies', () => {
      expect(handler).toBeInstanceOf(BaseAssetHandler);
      expect(handler['client']).toBe(mockClient);
      expect(handler['wallet']).toBe(mockWallet);
      expect(handler['keyPair']).toBe(mockKeyPair);
      expect(handler['logger']).toBe(logger);
    });
  });

  describe('abstract method implementations', () => {
    test('should implement balanceOf', async () => {
      const params: BalanceQueryParams = {
        address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' as any,
        token: { assetType: ChainAssetType.Native } as any
      };

      const result = await handler.balanceOf(params);
      expect(result).toEqual(new BigNumber('1'));
    });

    test('should implement transfer', async () => {
      const params: TransferParams = {
        recipientAddress: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' as any,
        amount: new BigNumber('0.5'),
        token: { assetType: ChainAssetType.Native } as any
      };

      const result = await handler.transfer(params);
      expect(result).toBe('test-hash');
    });

    test('should implement estimateFee', async () => {
      const params: TransferParams = {
        recipientAddress: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' as any,
        amount: new BigNumber('0.5'),
        token: { assetType: ChainAssetType.Native } as any
      };

      const result = await handler.estimateFee(params);
      expect(result).toEqual(new BigNumber('0.01'));
    });

    test('should implement getAssetType', () => {
      const result = handler.getAssetType();
      expect(result).toBe(ChainAssetType.Native);
    });

    test('should implement getWalletAddress', () => {
      const result = handler.getWalletAddress();
      expect(result).toBe('EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG');
    });
  });

  describe('protected property access', () => {
    test('should provide access to injected dependencies', () => {
      // Test that protected properties are accessible to subclasses
      expect(handler['client']).toBeDefined();
      expect(handler['wallet']).toBeDefined();
      expect(handler['keyPair']).toBeDefined();
      expect(handler['logger']).toBeDefined();
    });
  });
});
