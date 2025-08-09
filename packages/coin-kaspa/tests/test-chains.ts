import { ChainInfo } from '@delandlabs/coin-base';
import { ChainType, ChainNetwork, ChainId, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';

// Test-only ChainInfo configurations
// These are for testing purposes only and should not be used in production code
// In production, ChainInfo should be injected externally by the consuming application

// Kaspa Mainnet Configuration for tests
export const Kaspa: ChainInfo = {
  chainId: new ChainId(ChainType.Kaspa, ChainNetwork.KaspaMainNet),
  name: 'Kaspa',
  fullName: 'Kaspa Mainnet',
  icon: '/chain-icons/Kaspa.svg',
  nativeAssetSymbol: 'KAS',
  supportedSignaturesSchemas: [WalletSignatureSchema.KaspaSchnorr],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Kaspa,
  explorer: 'https://kas.fyi',
  rpc: {
    primary: 'https://api.kaspa.org'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://explorer.kaspa.org/txs/${txHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://explorer.kaspa.org/addresses/${address}`;
  }
};

// Kaspa Testnet Configuration for tests
export const KaspaTestnet: ChainInfo = {
  chainId: new ChainId(ChainType.Kaspa, ChainNetwork.KaspaTestNet),
  name: 'Kaspa Testnet',
  fullName: 'Kaspa Testnet 10',
  icon: '/chain-icons/Kaspa.svg',
  nativeAssetSymbol: 'KAS',
  supportedSignaturesSchemas: [WalletSignatureSchema.KaspaSchnorr],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Kaspa,
  explorer: 'https://explorer-tn10.kaspa.org/',
  rpc: {
    primary: 'https://api-tn10.kaspa.org'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://explorer-tn10.kaspa.org/txs/${txHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://explorer-tn10.kaspa.org/addresses/${address}`;
  }
};
