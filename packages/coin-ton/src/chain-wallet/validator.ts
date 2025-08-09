import { Address } from '@ton/ton';
import { ChainValidator } from '@delandlabs/coin-base';

/**
 * TON validator - single class for all TON address validation
 * Handles both wallet addresses and token contract addresses
 * Uses the same validation logic since TON addresses have uniform format
 */
export class TonValidator implements ChainValidator {
  /**
   * Validate TON wallet address
   * Uses @ton/ton Address.parse for comprehensive validation
   */
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    if (!trimmed) return false;

    try {
      Address.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate TON token contract address (Jetton addresses)
   * Same format as wallet addresses in TON
   */
  validateTokenAddress(tokenAddress: string): boolean {
    // In TON, Jetton addresses use the same format as wallet addresses
    return this.validateWalletAddress(tokenAddress);
  }
}
