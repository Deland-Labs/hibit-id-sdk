import { ChainInfo } from '@delandlabs/coin-base';
import { ChainType, ChainNetwork, ChainId, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';

// Test-only ChainInfo configurations
// These are for testing purposes only and should not be used in production code
// In production, ChainInfo should be injected externally by the consuming application

// TRON Mainnet Configuration for tests
export const Tron: ChainInfo = {
  chainId: new ChainId(ChainType.Tron, ChainNetwork.TronMainNet),
  name: 'Tron',
  fullName: 'Tron Mainnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Tron,
  explorer: 'https://tronscan.org',
  rpc: {
    primary: 'https://api.trongrid.io'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://tronscan.org/#/transaction/${txHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://tronscan.org/#/address/${address}`;
  }
};

// TRON Shasta Testnet Configuration for tests
export const TronShasta: ChainInfo = {
  chainId: new ChainId(ChainType.Tron, ChainNetwork.TronShastaTestNet),
  name: 'TronShasta',
  fullName: 'Tron Shasta Testnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Tron,
  explorer: 'https://shasta.tronscan.org',
  rpc: {
    primary: 'https://api.shasta.trongrid.io'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://shasta.tronscan.org/#/transaction/${txHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://shasta.tronscan.org/#/address/${address}`;
  }
};

// TRON Nile Testnet Configuration for tests
export const TronNile: ChainInfo = {
  chainId: new ChainId(ChainType.Tron, ChainNetwork.TronNileTestNet),
  name: 'TronNile',
  fullName: 'Tron Nile Testnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Tron,
  explorer: 'https://nile.tronscan.org',
  rpc: {
    primary: 'https://api.nileex.io'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://nile.tronscan.org/#/transaction/${txHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://nile.tronscan.org/#/address/${address}`;
  }
};
