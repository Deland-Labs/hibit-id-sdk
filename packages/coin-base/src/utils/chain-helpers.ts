import { ChainType } from '@delandlabs/hibit-basic-types';

/**
 * Get the name of a chain from its ChainType value
 * @param chainType - The numeric chain type value
 * @returns The name of the chain
 */
export function getChainName(chainType: ChainType): string {
  // Create a reverse mapping from values to keys
  const chainNames: Record<number, string> = {
    [ChainType.Bitcoin]: 'Bitcoin',
    [ChainType.Ethereum]: 'Ethereum',
    [ChainType.Solana]: 'Solana',
    [ChainType.Dfinity]: 'Dfinity',
    [ChainType.Ton]: 'Ton',
    [ChainType.Tron]: 'Tron',
    [ChainType.Kaspa]: 'Kaspa'
  };

  return chainNames[chainType] || `Unknown(${chainType})`;
}
