import { vi } from 'vitest';
import { Keypair } from '@kcoin/kaspa-web3.js';

/**
 * Create a test logger that captures debug/info/error calls
 */
export function createTestLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
}

/**
 * Create a mock keypair for testing
 */
export function createMockKeypair(): Keypair {
  const mockKeypair = {
    // Mock address generation
    toAddress: vi.fn().mockImplementation(() => ({
      toString: () => 'kaspa:qpumuen7l8wthtz45p3ftn58pvrs9xlumvkuu2xet8egzkcklqtes4ypce9sf'
    })),

    // Mock signing
    signMessageWithAuxData: vi.fn().mockReturnValue(new Uint8Array(64)),

    // Mock public key
    publicKey: new Uint8Array(33).fill(1),

    // Mock private key (should not be exposed in real implementation)
    privateKey: new Uint8Array(32).fill(2)
  };

  return mockKeypair as any;
}

/**
 * Standard test addresses for consistent testing
 */
export const TEST_ADDRESSES = {
  VALID_KASPA: 'kaspa:qpumuen7l8wthtz45p3ftn58pvrs9xlumvkuu2xet8egzkcklqtes4ypce9sf',
  INVALID: 'invalid-address',
  BITCOIN: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' // Invalid for Kaspa
};

/**
 * Standard test tokens for consistent testing
 */
export const TEST_TOKENS = {
  KRC20_TEST: {
    tokenAddress: 'TEST',
    assetType: 'KRC20' as const
  }
};
