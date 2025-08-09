// Setup file for Dfinity tests
import 'reflect-metadata';
import { vi } from 'vitest';

// Mock external network calls with complete module structure
vi.mock('@dfinity/agent', async () => {
  const actual = await vi.importActual('@dfinity/agent');
  return {
    ...actual,
    HttpAgent: vi.fn(() => ({
      fetchRootKey: vi.fn(),
      call: vi.fn(),
      query: vi.fn(),
      readState: vi.fn()
    })),
    Actor: {
      createActor: vi.fn()
    },
    AnonymousIdentity: vi.fn()
  };
});

// Mock other Dfinity modules
vi.mock('@dfinity/identity-secp256k1', () => ({
  Secp256k1KeyIdentity: {
    fromSecretKey: vi.fn()
  }
}));

vi.mock('@dfinity/ledger-icp', () => ({
  LedgerCanister: {
    create: vi.fn()
  }
}));

vi.mock('@dfinity/ledger-icrc', () => ({
  IcrcLedgerCanister: {
    create: vi.fn()
  }
}));

// Set up test environment
(globalThis as any).import = {
  meta: {
    env: {}
  }
};
