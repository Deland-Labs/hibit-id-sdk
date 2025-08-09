import { ChainType } from '@delandlabs/hibit-basic-types';
import { getChainName } from '../utils/chain-helpers';
import { ChainValidator } from './chain-validator';

/**
 * Chain validation registry - manages validators for all chains
 */
export class ChainValidation {
  private static validators = new Map<ChainType, ChainValidator>();

  /**
   * Register a validator for a specific chain
   */
  static register(chainType: ChainType, validator: ChainValidator): void {
    ChainValidation.validators.set(chainType, validator);
  }

  /**
   * Validate wallet address
   */
  static isValidWalletAddress(address: string, chainType: ChainType): boolean {
    const validator = ChainValidation.getValidator(chainType);
    return validator.validateWalletAddress(address);
  }

  /**
   * Validate token address
   */
  static isValidTokenAddress(tokenAddress: string, chainType: ChainType): boolean {
    const validator = ChainValidation.getValidator(chainType);
    return validator.validateTokenAddress(tokenAddress);
  }

  /**
   * Check if a validator is registered for the given chain type
   */
  static hasValidator(chainType: ChainType): boolean {
    return ChainValidation.validators.has(chainType);
  }

  private static getValidator(chainType: ChainType): ChainValidator {
    const validator = ChainValidation.validators.get(chainType);
    if (!validator) {
      const chainName = getChainName(chainType);
      throw new Error(`No validator registered for chain: ${chainName}`);
    }
    return validator;
  }

  /**
   * Clear all registered validators - mainly for testing
   */
  static clear(): void {
    ChainValidation.validators.clear();
  }
}
