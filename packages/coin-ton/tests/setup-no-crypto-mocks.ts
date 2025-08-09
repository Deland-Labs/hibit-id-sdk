// Setup file without mocking cryptographic operations
// This follows best practices by not mocking pure cryptographic functions

import 'reflect-metadata';
import { vi } from 'vitest';

// Mock modules that make external calls, but not crypto libraries
vi.mock('@ton/ton', async () => {
  const actual = await vi.importActual('@ton/ton');
  return {
    ...actual,
    TonClient: vi.fn(() => ({
      getBalance: vi.fn(),
      getTransactions: vi.fn(),
      sendMessage: vi.fn(),
      isContractDeployed: vi.fn()
    }))
  };
});

// Set up test environment
(globalThis as any).importMetaEnv = {
  VITE_TON_TESTNET_API_KEY: 'test-api-key',
  VITE_TON_MAINNET_API_KEY: 'test-api-key'
};

(globalThis as any).import = {
  meta: {
    env: (globalThis as any).importMetaEnv
  }
};
