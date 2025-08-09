import { describe, it, expect, beforeEach, vi } from 'vitest';
import BigNumber from 'bignumber.js';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { BalanceQueryParams } from '@delandlabs/coin-base';
import { KasNativeHandler, Krc20TokenHandler } from '../src/chain-wallet/asset-handlers';
import { createTestLogger, createMockKeypair } from './test-utils';

// Test address constants
const VALID_KASPA_ADDRESS = 'kaspa:qpumuen7l8wthtz45p3ftn58pvrs9xlumvkuu2xet8egzkcklqtes4ypce9sf';

describe('Kaspa Asset Handlers', () => {
  let logger: any;

  beforeEach(() => {
    logger = createTestLogger();
  });

  describe('KasNativeHandler', () => {
    it('should return Native asset type', () => {
      const mockRpcClient: any = {};
      const mockKrc20RpcClient: any = {};
      const mockKeyPair: any = createMockKeypair();
      const networkId: any = { networkType: 'testnet-10' };

      const handler = new KasNativeHandler(mockRpcClient, mockKrc20RpcClient, mockKeyPair, networkId, logger);

      expect(handler.getAssetType()).toBe(ChainAssetType.Native);
    });

    it('should return wallet address', () => {
      const mockRpcClient: any = {};
      const mockKrc20RpcClient: any = {};
      const mockKeyPair: any = createMockKeypair();
      const networkId: any = { networkType: 'testnet-10' };

      const handler = new KasNativeHandler(mockRpcClient, mockKrc20RpcClient, mockKeyPair, networkId, logger);

      expect(handler.getWalletAddress()).toBe(VALID_KASPA_ADDRESS);
    });

    it('should query native KAS balance', async () => {
      const mockRpcClient: any = {
        getBalanceByAddress: vi.fn().mockResolvedValue({ balance: '1000000000' }) // 10 KAS
      };
      const mockKrc20RpcClient: any = {};
      const mockKeyPair: any = createMockKeypair();
      const networkId: any = { networkType: 'testnet-10' };

      const handler = new KasNativeHandler(mockRpcClient, mockKrc20RpcClient, mockKeyPair, networkId, logger);

      const params: BalanceQueryParams = {
        address: VALID_KASPA_ADDRESS as any,
        token: { assetType: ChainAssetType.Native }
      };

      const balance = await handler.balanceOf(params);

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('1000000000'); // 1000000000 sompi (smallest unit)
      expect(mockRpcClient.getBalanceByAddress).toHaveBeenCalledWith(params.address);
    });
  });

  describe('Krc20TokenHandler', () => {
    it('should return KRC20 asset type', () => {
      const mockRpcClient: any = {};
      const mockKrc20RpcClient: any = {};
      const mockKeyPair: any = createMockKeypair();
      const networkId: any = { networkType: 'testnet-10' };

      const handler = new Krc20TokenHandler(mockRpcClient, mockKrc20RpcClient, mockKeyPair, networkId, logger);

      expect(handler.getAssetType()).toBe(ChainAssetType.KRC20);
    });

    it('should return wallet address', () => {
      const mockRpcClient: any = {};
      const mockKrc20RpcClient: any = {};
      const mockKeyPair: any = createMockKeypair();
      const networkId: any = { networkType: 'testnet-10' };

      const handler = new Krc20TokenHandler(mockRpcClient, mockKrc20RpcClient, mockKeyPair, networkId, logger);

      expect(handler.getWalletAddress()).toBe(VALID_KASPA_ADDRESS);
    });

    it('should query KRC20 token balance', async () => {
      const mockRpcClient: any = {};
      const mockKrc20RpcClient: any = {
        getKrc20Balance: vi.fn().mockResolvedValue({
          message: 'successful',
          result: [
            {
              tick: 'TEST',
              balance: '10000000000', // 100 tokens with 8 decimals
              locked: '0',
              dec: '8'
            }
          ]
        })
      };
      const mockKeyPair: any = createMockKeypair();
      const networkId: any = { networkType: 'testnet-10' };

      const handler = new Krc20TokenHandler(mockRpcClient, mockKrc20RpcClient, mockKeyPair, networkId, logger);

      const params: BalanceQueryParams = {
        address: VALID_KASPA_ADDRESS as any,
        token: { tokenAddress: 'TEST', assetType: ChainAssetType.KRC20 }
      };

      const balance = await handler.balanceOf(params);

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('10000000000'); // 10000000000 units (smallest unit)
      expect(mockKrc20RpcClient.getKrc20Balance).toHaveBeenCalledWith(params.address, 'TEST');
    });

    it('should require token address for balance query', async () => {
      const mockRpcClient: any = {};
      const mockKrc20RpcClient: any = {};
      const mockKeyPair: any = createMockKeypair();
      const networkId: any = { networkType: 'testnet-10' };

      const handler = new Krc20TokenHandler(mockRpcClient, mockKrc20RpcClient, mockKeyPair, networkId, logger);

      const params: BalanceQueryParams = {
        address: VALID_KASPA_ADDRESS as any,
        token: { assetType: ChainAssetType.KRC20 } // Missing tokenAddress
      };

      // Since validation is at wallet layer, handler will fail when trying to use undefined token address
      await expect(handler.balanceOf(params)).rejects.toThrow();
    });

    it('should handle cleanup', () => {
      const mockRpcClient: any = {};
      const mockKrc20RpcClient: any = {};
      const mockKeyPair: any = createMockKeypair();
      const networkId: any = { networkType: 'testnet-10' };

      const handler = new Krc20TokenHandler(mockRpcClient, mockKrc20RpcClient, mockKeyPair, networkId, logger);

      expect(typeof handler.cleanup).toBe('function');
      expect(() => handler.cleanup()).not.toThrow();
    });
  });
});
