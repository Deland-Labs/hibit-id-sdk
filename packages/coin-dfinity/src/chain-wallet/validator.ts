import { Principal } from '@dfinity/principal';
import { ChainValidator } from '@delandlabs/coin-base';

/**
 * Dfinity validator - simple address validation for Internet Computer
 */
export class DfinityValidator implements ChainValidator {
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    if (!trimmed) return false;

    // Check Principal format
    try {
      Principal.fromText(trimmed);
      return true;
    } catch {
      // Check AccountIdentifier format (64 hex characters)
      return trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed);
    }
  }

  validateTokenAddress(tokenAddress: string): boolean {
    // ICRC tokens and ICP native use same address formats
    return this.validateWalletAddress(tokenAddress);
  }
}
