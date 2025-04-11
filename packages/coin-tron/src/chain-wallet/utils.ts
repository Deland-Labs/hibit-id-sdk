import { ChainId, ChainInfo } from '@delandlabs/coin-base/model';
import * as TronChains from '../chains';

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
  const chains = Object.values(TronChains);
  return chains.find((c) => c.chainId.equals(chainId)) ?? null;
}

/**
 * Pads the front of the given hex string with zeroes until it reaches the
 * target length. If the input string is already longer than or equal to the
 * target length, it is returned unmodified.
 *
 * If the input string is "0x"-prefixed or not a hex string, an error will be
 * thrown.
 *
 * @param hexString - The hexadecimal string to pad with zeroes.
 * @param targetLength - The target length of the hexadecimal string.
 * @returns The input string front-padded with zeroes, or the original string
 * if it was already greater than or equal to to the target length.
 */
export function padWithZeroes(hexString: string, targetLength: number): string {
  if (hexString !== '' && !/^[a-f0-9]+$/iu.test(hexString)) {
    throw new Error(`Expected an unprefixed hex string. Received: ${hexString}`);
  }

  if (targetLength < 0) {
    throw new Error(`Expected a non-negative integer target length. Received: ${targetLength}`);
  }

  return String.prototype.padStart.call(hexString, targetLength, '0');
}
