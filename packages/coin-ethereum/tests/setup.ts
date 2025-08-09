/**
 * Test setup file to ensure proper initialization of address validators
 * This file should be imported by all test files to ensure consistent setup
 */

import { ChainValidation, ChainValidator } from '@delandlabs/coin-base';
import { isAddress } from 'ethers';
import { CHAIN_CONFIG } from '../src/chain-wallet/config';

// Ensure the Ethereum address validator is registered before any tests run
class MockEthereumValidator implements ChainValidator {
  validateWalletAddress(address: string): boolean {
    return isAddress(address);
  }
  validateTokenAddress(tokenAddress: string): boolean {
    return isAddress(tokenAddress);
  }
}

ChainValidation.register(CHAIN_CONFIG.CHAIN, new MockEthereumValidator());

// Export a helper function for creating Ethereum addresses in tests
export { CHAIN_CONFIG };
export function createEthereumAddress(address: string) {
  // This ensures the validator is always available for tests
  // Validator is already registered above
  return address;
}
