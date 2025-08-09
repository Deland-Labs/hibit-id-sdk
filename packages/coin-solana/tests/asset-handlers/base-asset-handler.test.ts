import { describe, it, expect, beforeEach } from 'vitest';
import { BaseAssetHandler } from '../../src/chain-wallet/asset-handlers/base-asset-handler';
import { ConnectionManager } from '../../src/chain-wallet/shared/connection-manager';
import { BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { createMockLogger, createSolanaAddress } from '../test-utils';

// Concrete implementation for testing
class TestAssetHandler extends BaseAssetHandler {
  async balanceOf(_params: BalanceQueryParams) {
    return Promise.resolve(new (await import('bignumber.js')).default(100));
  }

  async transfer(_params: TransferParams) {
    return Promise.resolve('test-signature');
  }

  async estimateFee(_params: TransferParams) {
    return Promise.resolve(new (await import('bignumber.js')).default(0.001));
  }

  getAssetType(): ChainAssetType {
    return ChainAssetType.Native;
  }

  cleanup(): void {
    // No cleanup needed for test handler
  }

  async getDecimals(): Promise<number> {
    return 9; // SOL has 9 decimals
  }
}

describe('BaseAssetHandler', () => {
  let connectionManager: ConnectionManager;
  let handler: TestAssetHandler;

  beforeEach(() => {
    const mockChainInfo = {
      chainId: { chain: 'Solana', network: 'mainnet' },
      rpc: { primary: 'https://api.mainnet-beta.solana.com' }
    };
    connectionManager = new ConnectionManager(mockChainInfo as any, createMockLogger());
    handler = new TestAssetHandler(connectionManager, createMockLogger());
  });

  it('should initialize with connection manager and logger', () => {
    expect(handler).toBeDefined();
    expect((handler as any).connectionManager).toBe(connectionManager);
    expect((handler as any).logger).toBeDefined();
  });

  it('should implement abstract methods', async () => {
    const mockBalanceParams: BalanceQueryParams = {
      address: createSolanaAddress('test-address'),
      token: { assetType: 'Native' as any }
    };

    const mockTransferParams: TransferParams = {
      recipientAddress: createSolanaAddress('test-recipient'),
      amount: new (await import('bignumber.js')).default(1),
      token: { assetType: 'Native' as any }
    };

    // Test that abstract methods are implemented
    await expect(handler.balanceOf(mockBalanceParams)).resolves.toBeDefined();
    await expect(handler.transfer(mockTransferParams)).resolves.toBeDefined();
    await expect(handler.estimateFee(mockTransferParams)).resolves.toBeDefined();
  });
});
