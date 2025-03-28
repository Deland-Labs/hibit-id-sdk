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
  explorer: 'https://solscan.io',
  // rpcUrls: [clusterApiUrl('mainnet-beta')],
  rpcUrls: [
    'https://go.getblock.io/4136d34f90a6488b84214ae26f0ed5f4',
    'https://solana-rpc.publicnode.com',
    'https://api.blockeden.xyz/solana/67nCBdZQSH9z3YqDDjdm',
    'https://endpoints.omniatech.io/v1/sol/mainnet/public',
    'https://solana.api.onfinality.io/public',
    'https://api.mainnet-beta.solana.com',
  ],
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
  explorer: 'https://solscan.io?cluster=testnet',
  rpcUrls: [clusterApiUrl('testnet')],
  caseSensitiveAddress: true
};
