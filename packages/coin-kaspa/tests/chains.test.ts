import 'reflect-metadata';
import './setup';
import { describe, expect, test } from 'vitest';
import { Kaspa, KaspaTestnet } from './test-chains';
import { ChainType, ChainNetwork, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';

describe('KASPA Chain Configurations', () => {
  describe('Kaspa Mainnet', () => {
    test('should have correct basic properties', () => {
      expect(Kaspa.name).toBe('Kaspa');
      expect(Kaspa.fullName).toBe('Kaspa Mainnet');
      expect(Kaspa.icon).toBe('/chain-icons/Kaspa.svg');
      expect(Kaspa.nativeAssetSymbol).toBe('KAS');
      expect(Kaspa.isMainnet).toBe(true);
      expect(Kaspa.isNativeGas).toBe(true);
      expect(Kaspa.ecosystem).toBe(Ecosystem.Kaspa);
    });

    test('should have correct chain ID', () => {
      expect(Kaspa.chainId.chain).toBe(ChainType.Kaspa);
      expect(Kaspa.chainId.network).toBe(ChainNetwork.KaspaMainNet);
    });

    test('should have correct signature schemas', () => {
      expect(Kaspa.supportedSignaturesSchemas).toEqual([WalletSignatureSchema.KaspaSchnorr]);
    });

    test('should have correct RPC URLs', () => {
      expect(Kaspa.rpc.primary).toBe('https://api.kaspa.org');
    });

    test('should have correct explorer URL', () => {
      expect(Kaspa.explorer).toBe('https://kas.fyi');
    });
  });

  describe('Kaspa Testnet', () => {
    test('should have correct basic properties', () => {
      expect(KaspaTestnet.name).toBe('Kaspa Testnet');
      expect(KaspaTestnet.fullName).toBe('Kaspa Testnet 10');
      expect(KaspaTestnet.icon).toBe('/chain-icons/Kaspa.svg');
      expect(KaspaTestnet.nativeAssetSymbol).toBe('KAS');
      expect(KaspaTestnet.isMainnet).toBe(false);
      expect(KaspaTestnet.isNativeGas).toBe(true);
      expect(KaspaTestnet.ecosystem).toBe(Ecosystem.Kaspa);
    });

    test('should have correct chain ID', () => {
      expect(KaspaTestnet.chainId.chain).toBe(ChainType.Kaspa);
      expect(KaspaTestnet.chainId.network).toBe(ChainNetwork.KaspaTestNet);
    });

    test('should have correct signature schemas', () => {
      expect(KaspaTestnet.supportedSignaturesSchemas).toEqual([WalletSignatureSchema.KaspaSchnorr]);
    });

    test('should have correct RPC URLs', () => {
      expect(KaspaTestnet.rpc.primary).toBe('https://api-tn10.kaspa.org');
    });

    test('should have correct explorer URL', () => {
      expect(KaspaTestnet.explorer).toBe('https://explorer-tn10.kaspa.org/');
    });
  });

  describe('Chain Comparisons', () => {
    test('all chains should share the same ecosystem and asset details', () => {
      const chains = [Kaspa, KaspaTestnet];

      chains.forEach((chain) => {
        expect(chain.ecosystem).toBe(Ecosystem.Kaspa);
        expect(chain.nativeAssetSymbol).toBe('KAS');
        expect(chain.isNativeGas).toBe(true);
        expect(chain.icon).toBe('/chain-icons/Kaspa.svg');
        expect(chain.supportedSignaturesSchemas).toEqual([WalletSignatureSchema.KaspaSchnorr]);
      });
    });

    test('mainnet and testnet should have different properties', () => {
      // Mainnet
      expect(Kaspa.isMainnet).toBe(true);
      expect(Kaspa.chainId.network).toBe(ChainNetwork.KaspaMainNet);

      // Testnet
      expect(KaspaTestnet.isMainnet).toBe(false);
      expect(KaspaTestnet.chainId.network).toBe(ChainNetwork.KaspaTestNet);
    });

    test('each chain should have unique name and explorer URLs', () => {
      expect(Kaspa.name).not.toBe(KaspaTestnet.name);
      expect(Kaspa.explorer).not.toBe(KaspaTestnet.explorer);
    });
  });
});
