import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from "@delandlabs/coin-base";
import { clusterApiUrl } from '@solana/web3.js';

export const Solana: ChainInfo = {
  chainId: new ChainId(Chain.Solana, ChainNetwork.SolanaMainNet),
  name: 'Solana',
  fullName: 'Solana Mainnet',
  icon: '/chain-icons/Solana.svg',
  nativeAssetSymbol: 'SOL',
  nativeAssetDecimals: 9,
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Solana,
  supportedSignaturesSchemas: [WalletSignatureSchema.SolanaEddsa],
  explorer: 'https://explorer.solana.com',
  rpcUrls: [clusterApiUrl('mainnet-beta')],
  caseSensitiveAddress: true
};
export const SolanaTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Solana, ChainNetwork.SolanaTestNet),
  name: 'SolanaTestnet',
  fullName: 'Solana Testnet',
  icon: '/chain-icons/Solana.svg',
  nativeAssetSymbol: 'SOL',
  nativeAssetDecimals: 9,
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Solana,
  supportedSignaturesSchemas: [WalletSignatureSchema.SolanaEddsa],
  explorer: 'https://explorer.solana.com?cluster=testnet',
  rpcUrls: [clusterApiUrl('testnet')],
  caseSensitiveAddress: true
};
