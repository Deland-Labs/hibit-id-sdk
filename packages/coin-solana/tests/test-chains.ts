import { ChainInfo } from '@delandlabs/coin-base';
import { ChainType, ChainNetwork, ChainId, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';

// Test-only ChainInfo configurations
// These are for testing purposes only and should not be used in production code
// In production, ChainInfo should be injected externally by the consuming application

// Solana Mainnet Configuration for tests
export const Solana: ChainInfo = {
  chainId: new ChainId(ChainType.Solana, ChainNetwork.SolanaMainNet),
  name: 'Solana',
  fullName: 'Solana Mainnet',
  icon: '/chain-icons/Solana.svg',
  nativeAssetSymbol: 'SOL',
  supportedSignaturesSchemas: [WalletSignatureSchema.SolanaEddsa],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Solana,
  explorer: 'https://solscan.io',
  rpc: {
    primary: 'https://solana-rpc.publicnode.com',
    fallbacks: ['https://api.mainnet-beta.solana.com']
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://solscan.io/tx/${txHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://solscan.io/account/${address}`;
  }
};

// Solana Testnet Configuration for tests
export const SolanaTestnet: ChainInfo = {
  chainId: new ChainId(ChainType.Solana, ChainNetwork.SolanaTestNet),
  name: 'SolanaTestnet',
  fullName: 'Solana Testnet',
  icon: '/chain-icons/Solana.svg',
  nativeAssetSymbol: 'SOL',
  supportedSignaturesSchemas: [WalletSignatureSchema.SolanaEddsa],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Solana,
  explorer: 'https://solscan.io?cluster=testnet',
  rpc: {
    primary: 'https://api.testnet.solana.com'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://solscan.io/tx/${txHash}?cluster=testnet`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://solscan.io/account/${address}?cluster=testnet`;
  }
};
