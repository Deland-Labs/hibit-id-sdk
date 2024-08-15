import { BlockNetwork } from '../basicEnums';
import { Chain, ChainId } from '../basicTypes';
import { Ethereum, EthereumAvalanche, EthereumAvalancheFuji, EthereumBase, EthereumBaseSepolia, EthereumBsc, EthereumBscTestnet, EthereumScroll, EthereumScrollSepolia, EthereumSepolia, EthereumBitlayer, EthereumBitlayerTestnet, Ton, TonTestnet } from './chain-list';
import { ChainInfo } from '../basicTypes';
import { BLOCK_NETWORK } from '../env';

// TODO: should update when we support more chains
const SupportedChainsForMainnet = [
  Ethereum,
  EthereumBsc,
  EthereumBase,
  EthereumScroll,
  EthereumAvalanche,
  EthereumBitlayer,
  // Bitcoin,
  // Solana,
  Ton,
  // Tron
];
const SupportedChainsForTestnet = [
  EthereumSepolia,
  EthereumBscTestnet,
  EthereumBaseSepolia,
  EthereumScrollSepolia,
  EthereumAvalancheFuji,
  EthereumBitlayerTestnet,
  // BitcoinTestnet,
  // SolanaTestnet,
  TonTestnet,
  // TronNile,
];

export function getChainByChainId(chainId: ChainId | null): ChainInfo | null {
  if (!chainId) return null;
  const chains = getSupportedChains();
  return chains.find(c => c.chainId.equals(chainId)) ?? null;
}

export function getSupportedChains(chainTypes?: Chain[]): ChainInfo[] {
  const supported =
    BLOCK_NETWORK === BlockNetwork.Mainnet
      ? SupportedChainsForMainnet
      : SupportedChainsForTestnet;
  return supported.filter(
    c => !chainTypes || !!chainTypes.find(type => type.equals(c.chainId.type))
  );
}
