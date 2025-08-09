/**
 * Test utilities for managing address validators in tests
 * Provides real validation logic for different chain types
 */

import { ChainType } from '@delandlabs/hibit-basic-types';
import { ChainValidation, ChainValidator } from '../src/validation';

/**
 * Ethereum address validator - validates hex addresses with 0x prefix
 */
const ethereumValidator = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Bitcoin address validator - simplified validation for common formats
 */
const bitcoinValidator = (address: string): boolean => {
  // P2PKH (starts with 1), P2SH (starts with 3), or Bech32 (starts with bc1)
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address);
};

/**
 * Solana address validator - Base58 encoded, 32 bytes
 */
const solanaValidator = (address: string): boolean => {
  // Simplified: should be Base58 and approximately 44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

/**
 * TON address validator - EQ format
 */
const tonValidator = (address: string): boolean => {
  return /^EQ[A-Za-z0-9_-]{46}$/.test(address);
};

/**
 * Generic test validator - accepts any reasonable looking address
 */
const genericValidator = (address: string): boolean => {
  return address.length >= 10 && address.length <= 100 && address.trim() === address;
};

/**
 * Test address examples for each chain
 */
export const TEST_ADDRESSES = {
  ethereum: {
    valid: '0x742b9e6f29d5f98d5db3e6acfb01e8c14f5b97f1',
    invalid: '0xinvalid'
  },
  bitcoin: {
    valid: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    invalid: 'invalid-btc'
  },
  solana: {
    valid: '11111111111111111111111111111112',
    invalid: 'invalid-sol'
  },
  ton: {
    valid: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
    invalid: 'invalid-ton'
  },
  generic: {
    valid: 'test_address_123',
    recipient: 'recipient_address_456',
    user: 'user_address_789'
  }
};

/**
 * Validator adapter for test functions
 */
class TestValidatorAdapter implements ChainValidator {
  constructor(private validator: (address: string) => boolean) {}

  validateWalletAddress(address: string): boolean {
    return this.validator(address);
  }

  validateTokenAddress(address: string): boolean {
    return this.validator(address);
  }
}

/**
 * Setup test validators for all supported chains
 */
export function setupTestValidators(): void {
  // Clear any existing validators
  ChainValidation.clear();

  // Register real validators using ChainType enum
  ChainValidation.register(ChainType.Ethereum, new TestValidatorAdapter(ethereumValidator));
  ChainValidation.register(ChainType.Bitcoin, new TestValidatorAdapter(bitcoinValidator));
  ChainValidation.register(ChainType.Solana, new TestValidatorAdapter(solanaValidator));
  ChainValidation.register(ChainType.Ton, new TestValidatorAdapter(tonValidator));

  // Create a mock chain type for generic testing - use an existing ChainType value
  ChainValidation.register(ChainType.Tron, new TestValidatorAdapter(genericValidator)); // Use Tron as generic for tests
}

/**
 * Cleanup test validators
 */
export function cleanupTestValidators(): void {
  ChainValidation.clear();
}

/**
 * Create a test validator that accepts specific addresses
 */
export function createMockValidator(validAddresses: string[]) {
  return (address: string): boolean => validAddresses.includes(address);
}
