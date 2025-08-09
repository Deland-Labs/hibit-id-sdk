import { isAddress } from 'ethers';
import { ChainValidator } from '@delandlabs/coin-base';

/**
 * Ethereum validator - simple address validation for Ethereum
 */
export class EthereumValidator implements ChainValidator {
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    if (!trimmed) return false;

    try {
      return isAddress(trimmed);
    } catch {
      return false;
    }
  }

  validateTokenAddress(tokenAddress: string): boolean {
    // ERC-20 token addresses use the same format as wallet addresses
    return this.validateWalletAddress(tokenAddress);
  }
}
