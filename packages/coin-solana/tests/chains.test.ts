import 'reflect-metadata';
import { describe, expect, test } from 'vitest';
import { Solana, SolanaTestnet } from './test-chains';
import { ChainType, ChainNetwork, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';

describe('Solana Chain Configurations', () => {
  describe('Solana Mainnet Configuration', () => {
    test('should have correct chain ID', () => {
      expect(Solana.chainId.chain).toBe(ChainType.Solana);
      expect(Solana.chainId.network).toBe(ChainNetwork.SolanaMainNet);
    });

    test('should have correct basic properties', () => {
      expect(Solana.name).toBe('Solana');
      expect(Solana.fullName).toBe('Solana Mainnet');
      expect(Solana.icon).toBe('/chain-icons/Solana.svg');
      expect(Solana.isMainnet).toBe(true);
      expect(Solana.ecosystem).toBe(Ecosystem.Solana);
    });

    test('should have correct native asset configuration', () => {
      expect(Solana.nativeAssetSymbol).toBe('SOL');
      expect(Solana.isNativeGas).toBe(true);
    });

    test('should have correct signature schema', () => {
      expect(Solana.supportedSignaturesSchemas).toContain(WalletSignatureSchema.SolanaEddsa);
      expect(Solana.supportedSignaturesSchemas.length).toBe(1);
    });

    test('should have valid explorer URL', () => {
      expect(Solana.explorer).toBe('https://solscan.io');
    });

    test('should have valid RPC configuration', () => {
      expect(Solana.rpc).toBeDefined();
      expect(Solana.rpc.primary).toBe('https://solana-rpc.publicnode.com');
      expect(Solana.rpc.fallbacks).toContain('https://api.mainnet-beta.solana.com');

      // Primary URL should be valid HTTPS URL
      expect(Solana.rpc.primary).toMatch(/^https:\/\/.+/);

      // Fallback URLs should be valid HTTPS URLs
      Solana.rpc.fallbacks?.forEach((url) => {
        expect(url).toMatch(/^https:\/\/.+/);
      });
    });

    // Note: caseSensitiveAddress field has been removed from ChainInfo
  });

  describe('Solana Testnet Configuration', () => {
    test('should have correct chain ID', () => {
      expect(SolanaTestnet.chainId.chain).toBe(ChainType.Solana);
      expect(SolanaTestnet.chainId.network).toBe(ChainNetwork.SolanaTestNet);
    });

    test('should have correct basic properties', () => {
      expect(SolanaTestnet.name).toBe('SolanaTestnet');
      expect(SolanaTestnet.fullName).toBe('Solana Testnet');
      expect(SolanaTestnet.icon).toBe('/chain-icons/Solana.svg');
      expect(SolanaTestnet.isMainnet).toBe(false);
      expect(SolanaTestnet.ecosystem).toBe(Ecosystem.Solana);
    });

    test('should have correct native asset configuration', () => {
      expect(SolanaTestnet.nativeAssetSymbol).toBe('SOL');
      expect(SolanaTestnet.isNativeGas).toBe(true);
    });

    test('should have correct signature schema', () => {
      expect(SolanaTestnet.supportedSignaturesSchemas).toContain(WalletSignatureSchema.SolanaEddsa);
      expect(SolanaTestnet.supportedSignaturesSchemas.length).toBe(1);
    });

    test('should have valid explorer URL with testnet parameter', () => {
      expect(SolanaTestnet.explorer).toBe('https://solscan.io?cluster=testnet');
    });

    test('should have valid RPC configuration', () => {
      expect(SolanaTestnet.rpc).toBeDefined();
      expect(SolanaTestnet.rpc.primary).toBeDefined();

      // Testnet should use cluster API URL
      expect(SolanaTestnet.rpc.primary).toMatch(/testnet/);
    });

    // Note: caseSensitiveAddress field has been removed from ChainInfo
  });

  describe('Chain Configuration Consistency', () => {
    test('mainnet and testnet should share same asset properties', () => {
      expect(Solana.nativeAssetSymbol).toBe(SolanaTestnet.nativeAssetSymbol);
      expect(Solana.isNativeGas).toBe(SolanaTestnet.isNativeGas);
      expect(Solana.ecosystem).toBe(SolanaTestnet.ecosystem);
      // Note: caseSensitiveAddress field has been removed from ChainInfo
    });

    test('mainnet and testnet should have same chain type', () => {
      expect(Solana.chainId.chain).toBe(SolanaTestnet.chainId.chain);
    });

    test('mainnet and testnet should have different network types', () => {
      expect(Solana.chainId.network).not.toBe(SolanaTestnet.chainId.network);
    });

    test('mainnet and testnet should have different isMainnet flags', () => {
      expect(Solana.isMainnet).toBe(true);
      expect(SolanaTestnet.isMainnet).toBe(false);
    });

    test('mainnet and testnet should support same signature schemas', () => {
      expect(Solana.supportedSignaturesSchemas).toEqual(SolanaTestnet.supportedSignaturesSchemas);
    });
  });

  describe('RPC URL Validation', () => {
    test('mainnet RPC URL should be valid and accessible format', () => {
      expect(Solana.rpc.primary).toMatch(/^https:\/\//);
      expect(Solana.rpc.primary.length).toBeGreaterThan(10);
    });

    test('testnet RPC URL should be valid and accessible format', () => {
      expect(SolanaTestnet.rpc.primary).toMatch(/^https:\/\//);
      expect(SolanaTestnet.rpc.primary.length).toBeGreaterThan(10);
    });
  });

  describe('Explorer URL Validation', () => {
    test('explorer URLs should be valid HTTPS URLs', () => {
      expect(Solana.explorer).toMatch(/^https:\/\//);
      expect(SolanaTestnet.explorer).toMatch(/^https:\/\//);
    });

    test('testnet explorer should have cluster parameter', () => {
      expect(SolanaTestnet.explorer).toContain('cluster=testnet');
    });
  });
});
