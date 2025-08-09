import 'reflect-metadata';
import { describe, expect, test, beforeEach } from 'vitest';
import { ChainInfo, Ecosystem, RpcConfiguration } from '../src/types/chain';
import { ChainId, ChainType, ChainNetwork, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';

describe('ChainInfo', () => {
  describe('Constructor and Properties', () => {
    test('should create ChainInfo instance with all required properties', () => {
      const chainInfo = new ChainInfo();

      // Set required properties
      chainInfo.chainId = new ChainId(ChainType.Ethereum, ChainNetwork.EthereumMainNet);
      chainInfo.name = 'Ethereum';
      chainInfo.fullName = 'Ethereum Mainnet';
      chainInfo.icon = '/icons/ethereum.svg';
      chainInfo.nativeAssetSymbol = 'ETH';
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.EvmEcdsa];
      chainInfo.explorer = 'https://etherscan.io';
      chainInfo.rpc = { primary: 'https://mainnet.infura.io' };
      chainInfo.isMainnet = true;
      chainInfo.isNativeGas = true;
      chainInfo.ecosystem = Ecosystem.EVM;

      expect(chainInfo.chainId).toBeInstanceOf(ChainId);
      expect(chainInfo.name).toBe('Ethereum');
      expect(chainInfo.fullName).toBe('Ethereum Mainnet');
      expect(chainInfo.icon).toBe('/icons/ethereum.svg');
      expect(chainInfo.nativeAssetSymbol).toBe('ETH');
      expect(chainInfo.supportedSignaturesSchemas).toEqual([WalletSignatureSchema.EvmEcdsa]);
      expect(chainInfo.explorer).toBe('https://etherscan.io');
      expect(chainInfo.rpc.primary).toBe('https://mainnet.infura.io');
      expect(chainInfo.isMainnet).toBe(true);
      expect(chainInfo.isNativeGas).toBe(true);
      expect(chainInfo.ecosystem).toBe(Ecosystem.EVM);
    });

    test('should handle optional properties', () => {
      const chainInfo = new ChainInfo();

      // Set required properties
      chainInfo.chainId = new ChainId(ChainType.Bitcoin, ChainNetwork.BtcMainNet);
      chainInfo.name = 'Bitcoin';
      chainInfo.fullName = 'Bitcoin Network';
      chainInfo.icon = '/icons/bitcoin.svg';
      chainInfo.nativeAssetSymbol = 'BTC';
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.EvmEcdsa];
      chainInfo.explorer = 'https://blockstream.info';
      chainInfo.rpc = { primary: 'https://bitcoin-rpc.example.com' };
      chainInfo.isMainnet = true;
      chainInfo.isNativeGas = true;
      chainInfo.ecosystem = Ecosystem.Bitcoin;

      // Set optional properties
      chainInfo.rpc.webSocket = 'wss://bitcoin-ws.example.com';
      chainInfo.getTransactionLink = (txId: string) => `https://blockstream.info/tx/${txId}`;
      chainInfo.getAddressLink = (address: string) => `https://blockstream.info/address/${address}`;

      expect(chainInfo.rpc.webSocket).toBe('wss://bitcoin-ws.example.com');
      expect(chainInfo.getTransactionLink).toBeDefined();
      expect(chainInfo.getAddressLink).toBeDefined();
    });
  });

  describe('Optional Method Behaviors', () => {
    let chainInfo: ChainInfo;

    beforeEach(() => {
      chainInfo = new ChainInfo();
      chainInfo.chainId = new ChainId(ChainType.Ethereum, ChainNetwork.BtcMainNet);
      chainInfo.name = 'Test Chain';
      chainInfo.fullName = 'Test Chain Network';
      chainInfo.icon = '/icons/test.svg';
      chainInfo.nativeAssetSymbol = 'TEST';
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.EvmEcdsa];
      chainInfo.explorer = 'https://test-explorer.com';
      chainInfo.rpc = { primary: 'https://test-rpc.com' };
      chainInfo.isMainnet = true;
      chainInfo.isNativeGas = true;
      chainInfo.ecosystem = Ecosystem.EVM;
    });

    test('getTransactionLink should generate correct transaction URL', () => {
      chainInfo.getTransactionLink = (txId: string) => {
        if (!txId?.trim()) return '';
        return `${chainInfo.explorer}/tx/${txId}`;
      };

      expect(chainInfo.getTransactionLink!('0x123abc')).toBe('https://test-explorer.com/tx/0x123abc');
      expect(chainInfo.getTransactionLink!('')).toBe('');
      expect(chainInfo.getTransactionLink!('   ')).toBe('');
    });

    test('getAddressLink should generate correct address URL', () => {
      chainInfo.getAddressLink = (address: string) => {
        if (!address?.trim()) return '';
        return `${chainInfo.explorer}/address/${address}`;
      };

      expect(chainInfo.getAddressLink!('0x123abc')).toBe('https://test-explorer.com/address/0x123abc');
      expect(chainInfo.getAddressLink!('')).toBe('');
      expect(chainInfo.getAddressLink!('   ')).toBe('');
    });
  });

  describe('Different Ecosystems', () => {
    test('should support EVM ecosystem', () => {
      const chainInfo = new ChainInfo();
      chainInfo.ecosystem = Ecosystem.EVM;
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.EvmEcdsa];

      expect(chainInfo.ecosystem).toBe(Ecosystem.EVM);
      expect(chainInfo.supportedSignaturesSchemas).toContain(WalletSignatureSchema.EvmEcdsa);
    });

    test('should support Solana ecosystem', () => {
      const chainInfo = new ChainInfo();
      chainInfo.ecosystem = Ecosystem.Solana;
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.SolanaEddsa];

      expect(chainInfo.ecosystem).toBe(Ecosystem.Solana);
      expect(chainInfo.supportedSignaturesSchemas).toContain(WalletSignatureSchema.SolanaEddsa);
    });

    test('should support TON ecosystem', () => {
      const chainInfo = new ChainInfo();
      chainInfo.ecosystem = Ecosystem.Ton;
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.TonEddsaOpenMask];

      expect(chainInfo.ecosystem).toBe(Ecosystem.Ton);
      expect(chainInfo.supportedSignaturesSchemas).toContain(WalletSignatureSchema.TonEddsaOpenMask);
    });

    test('should support Bitcoin ecosystem', () => {
      const chainInfo = new ChainInfo();
      chainInfo.ecosystem = Ecosystem.Bitcoin;
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.EvmEcdsa];

      expect(chainInfo.ecosystem).toBe(Ecosystem.Bitcoin);
      expect(chainInfo.supportedSignaturesSchemas).toContain(WalletSignatureSchema.EvmEcdsa);
    });

    test('should support TRON ecosystem', () => {
      const chainInfo = new ChainInfo();
      chainInfo.ecosystem = Ecosystem.Tron;
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.EvmEcdsa];

      expect(chainInfo.ecosystem).toBe(Ecosystem.Tron);
      expect(chainInfo.supportedSignaturesSchemas).toContain(WalletSignatureSchema.EvmEcdsa);
    });

    test('should support ICP ecosystem', () => {
      const chainInfo = new ChainInfo();
      chainInfo.ecosystem = Ecosystem.ICP;
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.IcpEddsa];

      expect(chainInfo.ecosystem).toBe(Ecosystem.ICP);
      expect(chainInfo.supportedSignaturesSchemas).toContain(WalletSignatureSchema.IcpEddsa);
    });

    test('should support Kaspa ecosystem', () => {
      const chainInfo = new ChainInfo();
      chainInfo.ecosystem = Ecosystem.Kaspa;
      chainInfo.supportedSignaturesSchemas = [WalletSignatureSchema.EvmEcdsa];

      expect(chainInfo.ecosystem).toBe(Ecosystem.Kaspa);
      expect(chainInfo.supportedSignaturesSchemas).toContain(WalletSignatureSchema.EvmEcdsa);
    });
  });

  describe('RPC Configuration', () => {
    test('should handle simple RPC configuration', () => {
      const chainInfo = new ChainInfo();
      chainInfo.rpc = { primary: 'https://mainnet.infura.io' };

      expect(chainInfo.rpc.primary).toBe('https://mainnet.infura.io');
      expect(chainInfo.rpc.fallbacks).toBeUndefined();
      expect(chainInfo.rpc.webSocket).toBeUndefined();
    });

    test('should handle RPC configuration with fallbacks', () => {
      const chainInfo = new ChainInfo();
      chainInfo.rpc = {
        primary: 'https://mainnet.infura.io',
        fallbacks: ['https://eth-mainnet.alchemyapi.io', 'https://cloudflare-eth.com']
      };

      expect(chainInfo.rpc.primary).toBe('https://mainnet.infura.io');
      expect(chainInfo.rpc.fallbacks).toHaveLength(2);
      expect(chainInfo.rpc.fallbacks![0]).toBe('https://eth-mainnet.alchemyapi.io');
      expect(chainInfo.rpc.fallbacks![1]).toBe('https://cloudflare-eth.com');
    });

    test('should handle RPC configuration with WebSocket', () => {
      const chainInfo = new ChainInfo();
      chainInfo.rpc = {
        primary: 'https://mainnet.infura.io',
        webSocket: 'wss://mainnet.infura.io/ws'
      };

      expect(chainInfo.rpc.primary).toBe('https://mainnet.infura.io');
      expect(chainInfo.rpc.webSocket).toBe('wss://mainnet.infura.io/ws');
    });

    test('should handle complete RPC configuration', () => {
      const chainInfo = new ChainInfo();
      chainInfo.rpc = {
        primary: 'https://mainnet.infura.io',
        fallbacks: ['https://eth-mainnet.alchemyapi.io'],
        webSocket: 'wss://mainnet.infura.io/ws'
      };

      expect(chainInfo.rpc.primary).toBe('https://mainnet.infura.io');
      expect(chainInfo.rpc.fallbacks).toHaveLength(1);
      expect(chainInfo.rpc.fallbacks![0]).toBe('https://eth-mainnet.alchemyapi.io');
      expect(chainInfo.rpc.webSocket).toBe('wss://mainnet.infura.io/ws');
    });

    test('should handle empty fallbacks array', () => {
      const chainInfo = new ChainInfo();
      chainInfo.rpc = {
        primary: 'https://mainnet.infura.io',
        fallbacks: []
      };

      expect(chainInfo.rpc.primary).toBe('https://mainnet.infura.io');
      expect(chainInfo.rpc.fallbacks).toEqual([]);
      expect(chainInfo.rpc.fallbacks).toHaveLength(0);
    });
  });

  describe('RpcConfiguration Interface', () => {
    test('should create valid RpcConfiguration objects', () => {
      const basicConfig: RpcConfiguration = {
        primary: 'https://rpc.example.com'
      };

      const fullConfig: RpcConfiguration = {
        primary: 'https://rpc.example.com',
        fallbacks: ['https://rpc2.example.com', 'https://rpc3.example.com'],
        webSocket: 'wss://ws.example.com'
      };

      expect(basicConfig.primary).toBe('https://rpc.example.com');
      expect(basicConfig.fallbacks).toBeUndefined();
      expect(basicConfig.webSocket).toBeUndefined();

      expect(fullConfig.primary).toBe('https://rpc.example.com');
      expect(fullConfig.fallbacks).toHaveLength(2);
      expect(fullConfig.webSocket).toBe('wss://ws.example.com');
    });
  });
});
