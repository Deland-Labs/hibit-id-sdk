import { BlockNetwork } from '../basicEnums';
import { Chain, ChainId } from '../basicTypes';
import { Ethereum, EthereumSepolia, Ton, TonTestnet } from './chain-list';
import { ChainInfo } from '../basicTypes';
import { BLOCK_NETWORK } from '../env';

// TODO: should update when we support more chains
const SupportedChainsForMainnet = [
  Ethereum,
  // EthereumBsc,
  // EthereumBase,
  // EthereumScroll,
  // EthereumAvalanche,
  // Bitcoin,
  // Solana,
  Ton,
  // Tron
];
const SupportedChainsForTestnet = [
  EthereumSepolia,
  // EthereumBscTestnet,
  // EthereumBaseSepolia,
  // EthereumScrollSepolia,
  // EthereumAvalancheFuji,
  // BitcoinTestnet,
  // SolanaTestnet,
  TonTestnet,
  // TronNile,
];

export function getChainByChainId(chainId: ChainId): ChainInfo | null {
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
