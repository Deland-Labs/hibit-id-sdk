import { describe, it, expect } from 'vitest';
import {
  clamp,
  parseBalanceRequest,
  stringifyBalanceRequest
} from '../src/lib/utils';
import { GetBalanceRequest } from '../src/lib/types';
import {
  ChainAssetType,
  ChainType,
  ChainNetwork,
  ChainId
} from '@delandlabs/hibit-basic-types';

describe('Utils', () => {
  describe('clamp', () => {
    it('should clamp value within min and max', () => {
      expect(clamp(0, 5, 10)).toBe(5);
      expect(clamp(0, -5, 10)).toBe(0);
      expect(clamp(0, 15, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(5, 5, 5)).toBe(5);
      expect(clamp(0, 0, 0)).toBe(0);
      expect(clamp(-10, -5, 10)).toBe(-5);
    });
  });

  describe('Balance Request Serialization', () => {
    it('should stringify and parse balance request', () => {
      const request: GetBalanceRequest = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        assetType: ChainAssetType.Native
      };

      const stringified = stringifyBalanceRequest(request);
      const parsed = parseBalanceRequest(stringified);

      expect(parsed).toEqual(request);
    });

    it('should handle ERC20 token requests', () => {
      const request: GetBalanceRequest = {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        assetType: ChainAssetType.ERC20,
        contractAddress: '0x1234567890abcdef'
      };

      const stringified = stringifyBalanceRequest(request);
      const parsed = parseBalanceRequest(stringified);

      expect(parsed).toEqual(request);
    });

    it('should create unique strings for different requests', () => {
      const request1: GetBalanceRequest = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        assetType: ChainAssetType.Native
      };

      const request2: GetBalanceRequest = {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        assetType: ChainAssetType.Native
      };

      const stringified1 = stringifyBalanceRequest(request1);
      const stringified2 = stringifyBalanceRequest(request2);

      expect(stringified1).not.toBe(stringified2);
    });

    it('should create same string for identical requests', () => {
      const request1: GetBalanceRequest = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        assetType: ChainAssetType.ERC20,
        contractAddress: '0xtoken123'
      };

      const request2: GetBalanceRequest = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        assetType: ChainAssetType.ERC20,
        contractAddress: '0xtoken123'
      };

      const stringified1 = stringifyBalanceRequest(request1);
      const stringified2 = stringifyBalanceRequest(request2);

      expect(stringified1).toBe(stringified2);
    });
  });
});
