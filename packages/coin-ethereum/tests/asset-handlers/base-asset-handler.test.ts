import { expect, test, describe, vi, beforeEach } from 'vitest';
import { BaseAssetHandler } from '../../src/chain-wallet/asset-handlers/base-asset-handler';
import { ConnectionManager } from '../../src/chain-wallet/shared/connection-manager';
import { ILogger, NoOpLogger, SignMessageParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { isAddress } from 'ethers';
// Import test setup to ensure address validator is registered
import '../setup';

// Create a concrete implementation for testing
class TestAssetHandler extends BaseAssetHandler {
  async balanceOf(): Promise<any> {
    return null;
  }
  async transfer(): Promise<string> {
    return '';
  }
  async estimateFee(): Promise<any> {
    return null;
  }
  async signMessage(_params: SignMessageParams): Promise<Uint8Array> {
    throw new Error('Message signing is not supported by this asset handler');
  }
  getAssetType(): ChainAssetType {
    return ChainAssetType.Native;
  }
  supportsMessageSigning(): boolean {
    return false;
  }
  isValidAddress(address: string): boolean {
    return isAddress(address);
  }
  getWalletAddress(): string {
    const wallet = this.connectionManager.getWallet();
    return wallet.address;
  }
  async getDecimals(): Promise<number> {
    return 18; // ETH decimals for test
  }

  cleanup(): void {
    // Test implementation - no resources to clean up
  }
}

describe('BaseAssetHandler', () => {
  let connectionManager: ConnectionManager;
  let logger: ILogger;
  let handler: TestAssetHandler;

  beforeEach(() => {
    logger = new NoOpLogger();
    connectionManager = {
      getProvider: vi.fn(),
      getWallet: vi.fn(),
      getConnectedWallet: vi.fn(),
      cleanup: vi.fn()
    } as any;
    handler = new TestAssetHandler(connectionManager, logger);
  });

  describe('constructor', () => {
    test('should initialize with connection manager and logger', () => {
      expect(handler).toBeDefined();
      expect(handler['connectionManager']).toBe(connectionManager);
      expect(handler['logger']).toBe(logger);
    });
  });

  describe('signMessage', () => {
    test('should throw error for unsupported operation', async () => {
      await expect(handler.signMessage({ message: 'test' })).rejects.toThrow(
        'Message signing is not supported by this asset handler'
      );
    });
  });

  describe('getWalletAddress', () => {
    test('should return wallet address from connection manager', () => {
      const mockWallet = { address: '0x742d35cC6634C0532925a3B844BC9e7C68F8C574' };
      connectionManager.getWallet = vi.fn().mockReturnValue(mockWallet);

      expect(handler.getWalletAddress()).toBe(mockWallet.address);
      expect(connectionManager.getWallet).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    test('should provide cleanup method', () => {
      expect(() => handler.cleanup()).not.toThrow();
    });
  });
});
