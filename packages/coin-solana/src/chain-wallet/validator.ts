import { PublicKey } from '@solana/web3.js';
import { ChainValidator } from '@delandlabs/coin-base';

/**
 * Solana validator - single class for all Solana address validation
 * Handles both wallet addresses and token contract addresses
 * Uses the same validation logic since Solana addresses have uniform format
 */
export class SolanaValidator implements ChainValidator {
  /**
   * Validate Solana wallet address
   * Uses @solana/web3.js PublicKey for comprehensive validation
   */
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    if (!trimmed) return false;

    try {
      new PublicKey(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate Solana token contract address
   * Same format as wallet addresses in Solana
   */
  validateTokenAddress(tokenAddress: string): boolean {
    // In Solana, token mint addresses use the same format as wallet addresses
    return this.validateWalletAddress(tokenAddress);
  }
}
