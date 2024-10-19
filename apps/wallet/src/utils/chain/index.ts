import { Chain, ChainId } from '../basicTypes';
import { Ethereum, EthereumAvalanche, EthereumAvalancheFuji, EthereumBase, EthereumBaseSepolia, EthereumBsc, EthereumBscTestnet, EthereumScroll, EthereumScrollSepolia, EthereumSepolia, EthereumBitlayer, EthereumBitlayerTestnet, Ton, TonTestnet, Dfinity } from './chain-list';
import { ChainInfo } from '../basicTypes';
import { RUNTIME_SUPPORTED_CHAIN_IDS } from '../runtime';
import hibitIdSession from '../../stores/session';

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
  // Tron,
  Dfinity,
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
  // TODO: Dfinity testnet
];

export function getChainByChainId(chainId: ChainId | null, devMode?: boolean): ChainInfo | null {
  if (!chainId) return null;
  const chains = getSupportedChains(devMode);
  return chains.find(c => c.chainId.equals(chainId)) ?? null;
}

export function getSupportedChains(devMode?: boolean, chainTypes?: Chain[]): ChainInfo[] {
  let supported = (devMode ?? hibitIdSession.config.devMode) ? SupportedChainsForTestnet : SupportedChainsForMainnet;
  if (RUNTIME_SUPPORTED_CHAIN_IDS.length > 0) {
    supported = supported.filter(
      c => RUNTIME_SUPPORTED_CHAIN_IDS.find((id) => id.equals(c.chainId))
    );
  }
  return supported.filter(
    c => !chainTypes || !!chainTypes.find(type => type.equals(c.chainId.type))
  );
}

export function getDevModeSwitchChain(isCurrentDevMode: boolean, chainId: ChainId): ChainInfo {
  const [currentList, mappingList] = isCurrentDevMode
    ? [SupportedChainsForTestnet, SupportedChainsForMainnet]
    : [SupportedChainsForMainnet, SupportedChainsForTestnet];
  const index = currentList.findIndex(c => c.chainId.equals(chainId));
  return index < 0 ? mappingList[0] : mappingList[index];
}
