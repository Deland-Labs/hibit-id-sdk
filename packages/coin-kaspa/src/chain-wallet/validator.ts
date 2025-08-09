import { Address } from '@kcoin/kaspa-web3.js';
import { ChainValidator } from '@delandlabs/coin-base';

/**
 * Kaspa validator - simple address validation for Kaspa
 */
export class KaspaValidator implements ChainValidator {
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    if (!trimmed) return false;

    try {
      Address.fromString(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  validateTokenAddress(tokenAddress: string): boolean {
    // KRC20 uses ticker format: 4-6 letter unique identifier (case-insensitive)
    if (!tokenAddress || typeof tokenAddress !== 'string') return false;
    const trimmed = tokenAddress.trim();
    if (!trimmed) return false;

    // Check length: 4-6 characters
    if (trimmed.length < 4 || trimmed.length > 6) return false;

    // Check format: only letters (A-Z, a-z)
    return /^[A-Za-z]+$/.test(trimmed);
  }
}
