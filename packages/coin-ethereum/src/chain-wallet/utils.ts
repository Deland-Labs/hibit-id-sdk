import { ChainId, ChainInfo } from '@delandlabs/coin-base';
import * as EthereumChains from './chain'

export const erc20Abi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address recipient, uint256 amount) returns (bool)',

  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)',

  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

export function getChain(chainId: ChainId | null): ChainInfo | null {
  if (!chainId) return null;
  const chains = Object.values(EthereumChains)
  return chains.find(c => c.chainId.equals(chainId)) ?? null;
}
