import { Chain, ChainId } from '../basicTypes';
import { Ethereum, EthereumAvalanche, EthereumAvalancheFuji, EthereumBase, EthereumBaseSepolia, EthereumBsc, EthereumBscTestnet, EthereumScroll, EthereumScrollSepolia, EthereumSepolia, EthereumBitlayer, EthereumBitlayerTestnet, Ton, TonTestnet, Dfinity, EthereumSwan, EthereumSwanTestnet, Kaspa, KaspaTestnet } from './chain-list';
import { ChainInfo } from '../basicTypes';
import { RUNTIME_SUPPORTED_CHAIN_IDS } from '../runtime';
import hibitIdSession from '../../stores/session';
import { HIBIT_ENV } from '../env';
import { HibitEnv } from '../basicEnums';

// TODO: should update when we support more chains
const SupportedChainsForMainnet = [
  Ethereum,
  EthereumBsc,
  EthereumBase,
  EthereumScroll,
  EthereumAvalanche,
  EthereumBitlayer,
  EthereumSwan,
  // Bitcoin,
  // Solana,
  Ton,
  // Tron,
  Dfinity,
  Kaspa,
];
const SupportedChainsForTestnet = [
  EthereumSepolia,
  EthereumBscTestnet,
  EthereumBaseSepolia,
  EthereumScrollSepolia,
  EthereumAvalancheFuji,
  EthereumBitlayerTestnet,
  EthereumSwanTestnet,
  // BitcoinTestnet,
  // SolanaTestnet,
  TonTestnet,
  // TronNile,
  KaspaTestnet,
];
if (HIBIT_ENV !== HibitEnv.PROD) {
  SupportedChainsForTestnet.push(Dfinity)
}

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
  const devModeChains = getSupportedChains(true)
  const nonDevModeChains = getSupportedChains(false)
  const mappingList = isCurrentDevMode ? nonDevModeChains : devModeChains;
  const newChain = mappingList.find(c => c.chainId.type.equals(chainId.type) && c.isMainnet === !isCurrentDevMode);
  return !newChain ? mappingList[0] : newChain;
}
