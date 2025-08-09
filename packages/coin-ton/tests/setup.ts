import { vi } from 'vitest';
import { ChainValidation, ChainValidator } from '@delandlabs/coin-base';
import { ChainType } from '@delandlabs/hibit-basic-types';

// Register TON address validator for tests
class MockTonValidator implements ChainValidator {
  validateWalletAddress(_address: string): boolean {
    return true; // Mock validator always returns true for tests
  }
  validateTokenAddress(_tokenAddress: string): boolean {
    return true; // Mock validator always returns true for tests
  }
}

ChainValidation.register(ChainType.Ton, new MockTonValidator());
// Mock validator is now registered above

// Mock import.meta.env for tests
(globalThis as any).importMetaEnv = {
  VITE_HIBIT_TON_MAINNET_ENDPOINT: 'https://toncenter.com/api/v2/',
  VITE_HIBIT_TON_TESTNET_ENDPOINT: 'https://testnet.toncenter.com/api/v2/'
};

// Mock import.meta
(globalThis as any).import = {
  meta: {
    env: (globalThis as any).importMetaEnv
  }
};

// Enable automatic mocking for TON modules with explicit factory functions
// Must be at top level, not inside hoisted
vi.mock('@ton/core', () => import('./__mocks__/@ton/core'));
vi.mock('@ton/crypto', () => import('./__mocks__/@ton/crypto'));
vi.mock('@ton/ton', () => import('./__mocks__/@ton/ton'));

// Mock tweetnacl
vi.mock('tweetnacl', () => ({
  default: {
    sign: {
      detached: vi.fn().mockReturnValue(new Uint8Array(64)),
      keyPair: {
        fromSeed: vi.fn().mockReturnValue({
          publicKey: new Uint8Array(32),
          secretKey: new Uint8Array(64)
        })
      }
    }
  }
}));

// Console log to confirm mocks are loaded
console.log('✅ TON SDK mocks loaded successfully');
