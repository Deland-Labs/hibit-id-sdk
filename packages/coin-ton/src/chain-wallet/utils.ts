import { ChainId, ChainInfo } from '@delandlabs/coin-base/model';
import * as TonChains from '../chains';

export function getChain(chainId: ChainId | null): ChainInfo | null {
  if (!chainId) return null;
  const chains = Object.values(TonChains);
  return chains.find((c) => c.chainId.equals(chainId)) ?? null;
}

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
