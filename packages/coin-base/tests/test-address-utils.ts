import { ChainType } from '@delandlabs/hibit-basic-types';
import { Address, createAddress } from '../src/types/branded';
import { ChainValidation, ChainValidator } from '../src/validation';

/**
 * Mock Ethereum validator for testing
 */
const mockEthereumValidator = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Mock Bitcoin validator for testing
 */
const mockBitcoinValidator = (address: string): boolean => {
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
};

/**
 * Mock generic validator for testing (accepts any string starting with "test_")
 */
const mockGenericValidator = (address: string): boolean => {
  return address.startsWith('test_');
};

// Export validators
export { mockEthereumValidator, mockBitcoinValidator, mockGenericValidator };

/**
 * Test addresses for different chains
 */
export const TEST_ADDRESSES = {
  ethereum: {
    valid: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E8e0',
    invalid: '0xinvalid'
  },
  bitcoin: {
    valid: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    invalid: 'invalid'
  },
  solana: {
    valid: '7VQo3HFLNH5QqGtM8eC3GQjkbpzaa8CxyfMSr2JH1eFi',
    invalid: 'invalid'
  },
  ton: {
    valid: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    invalid: 'invalid'
  },
  generic: {
    valid: 'test_address_123',
    recipient: 'test_recipient_456',
    user: 'test_user_789'
  }
};

/**
 * Simple validator adapter for test functions
 */
class TestValidatorAdapter implements ChainValidator {
  constructor(private validator: (address: string) => boolean) {}

  validateWalletAddress(address: string): boolean {
    return this.validator(address);
  }

  validateTokenAddress(tokenAddress: string): boolean {
    return this.validator(tokenAddress);
  }
}

/**
 * Setup test validators for all chains used in tests
 */
export function setupTestValidators(): void {
  ChainValidation.register(ChainType.Ethereum, new TestValidatorAdapter(mockEthereumValidator));
  ChainValidation.register(ChainType.Bitcoin, new TestValidatorAdapter(mockBitcoinValidator));
  ChainValidation.register(ChainType.Solana, new TestValidatorAdapter(mockGenericValidator)); // For test purposes
  ChainValidation.register(ChainType.Ton, new TestValidatorAdapter(mockGenericValidator)); // For test purposes
  ChainValidation.register(ChainType.Tron, new TestValidatorAdapter(mockGenericValidator)); // For test purposes
  ChainValidation.register(ChainType.Dfinity, new TestValidatorAdapter(mockGenericValidator)); // For test purposes
  ChainValidation.register(ChainType.Kaspa, new TestValidatorAdapter(mockGenericValidator)); // For test purposes
}

/**
 * Clear all validators (useful for test cleanup)
 */
export function clearValidators(): void {
  ChainValidation.clear();
}

/**
 * Helper to create mock addresses for testing using real ChainType
 * Note: In production code, always use createAddress with proper validation
 */
export function createMockAddress(
  address: string,
  chainType: ChainType = ChainType.Ethereum
): Address<typeof chainType> {
  // Ensure validator is registered
  if (!ChainValidation.hasValidator(chainType)) {
    setupTestValidators();
  }
  return createAddress(address, chainType);
}
