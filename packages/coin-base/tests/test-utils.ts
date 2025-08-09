import { ChainType } from '@delandlabs/hibit-basic-types';
import { ChainValidation, ChainValidator } from '../src/validation';

/**
 * Simple test validator
 */
class SimpleTestValidator implements ChainValidator {
  constructor(private prefix: string) {}

  validateWalletAddress(address: string): boolean {
    return address.startsWith(this.prefix);
  }

  validateTokenAddress(address: string): boolean {
    return address.startsWith(this.prefix);
  }
}

/**
 * Register a mock validator for testing
 * This allows us to create addresses without importing specific chain validators
 */
export function registerMockValidator() {
  ChainValidation.register(ChainType.Ethereum, new SimpleTestValidator('0x'));
}

/**
 * Clear all validators (useful for test cleanup)
 */
export function clearValidators() {
  ChainValidation.clear();
}
