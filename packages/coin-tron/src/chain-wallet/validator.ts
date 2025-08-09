import { ChainValidator } from '@delandlabs/coin-base';
import { base } from '@delandlabs/crypto-lib';

/**
 * TRON validator - simple address validation for TRON
 */
export class TronValidator implements ChainValidator {
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    if (!trimmed) return false;

    // Basic format check: starts with T and is 34 characters
    if (!trimmed.startsWith('T') || trimmed.length !== 34) {
      return false;
    }

    // Check if it's a valid Base58Check encoded address
    try {
      const decoded = base.fromBase58Check(trimmed);
      return decoded.length === 21 && decoded[0] === 0x41; // 0x41 is TRON address prefix
    } catch {
      return false;
    }
  }

  validateTokenAddress(tokenAddress: string): boolean {
    // TRC20 contract addresses use the same format as wallet addresses
    return this.validateWalletAddress(tokenAddress);
  }
}
