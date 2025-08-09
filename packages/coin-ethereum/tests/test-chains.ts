import { ChainInfo } from '@delandlabs/coin-base';
import { ChainType, ChainNetwork, ChainId, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';

// Test-only ChainInfo configurations
// These are for testing purposes only and should not be used in production code
// In production, ChainInfo should be injected externally by the consuming application

// Ethereum Mainnet Configuration for tests
export const Ethereum: ChainInfo = {
  chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumMainNet),
  name: 'Ethereum',
  fullName: 'Ethereum Mainnet',
  icon: '/chain-icons/Ethereum.svg',
  nativeAssetSymbol: 'ETH',
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
  explorer: 'https://etherscan.io',
  rpc: {
    primary: 'https://mainnet.infura.io',
    webSocket: 'wss://mainnet.infura.io/ws'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    const cleanHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    return `https://etherscan.io/tx/${cleanHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://etherscan.io/address/${address}`;
  }
};

// Ethereum Sepolia Testnet Configuration for tests
export const EthereumSepolia: ChainInfo = {
  chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
  name: 'ETH Sepolia',
  fullName: 'ETH Sepolia Testnet',
  icon: '/chain-icons/Ethereum.svg',
  nativeAssetSymbol: 'ETH',
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
  explorer: 'https://sepolia.etherscan.io',
  rpc: {
    primary: 'https://ethereum-sepolia-rpc.publicnode.com'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://sepolia.etherscan.io/address/${address}`;
  }
};

// BSC (Binance Smart Chain) Configuration for tests
export const EthereumBsc: ChainInfo = {
  chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EvmBscMainNet),
  name: 'BSC',
  fullName: 'BNB Smart Chain',
  icon: '/chain-icons/BSC.svg',
  nativeAssetSymbol: 'BNB',
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM, // BSC is EVM-compatible
  explorer: 'https://bscscan.com',
  rpc: {
    primary: 'https://bsc-rpc.publicnode.com',
    fallbacks: ['https://bsc-dataseed.bnbchain.org']
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    return `https://bscscan.com/tx/${txHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://bscscan.com/address/${address}`;
  }
};
