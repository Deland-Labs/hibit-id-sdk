import { vi } from 'vitest';

/**
 * Helper function to set up all required mocks for ICP wallet tests
 */
export async function setupIcpMocks() {
  // Mock crypto library
  const { deriveEcdsaPrivateKey } = await import('@delandlabs/crypto-lib');
  vi.mocked(deriveEcdsaPrivateKey as any).mockResolvedValue(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  );

  // Mock createAgent
  const { createAgent } = await import('@dfinity/utils');
  vi.mocked(createAgent).mockResolvedValue({
    call: vi.fn(),
    query: vi.fn(),
    readState: vi.fn(),
    rootKey: null
  } as any);

  // Mock IC
  const mockIc = vi.fn().mockReturnValue({
    call: vi.fn().mockResolvedValue([
      {
        name: 'ICRC-3',
        url: 'https://github.com/dfinity/ICRC-3'
      }
    ])
  });
  vi.mocked(await import('ic0')).default = mockIc;

  // Mock LedgerCanister
  const { LedgerCanister } = await import('@dfinity/ledger-icp');
  vi.mocked(LedgerCanister.create).mockReturnValue({
    accountBalance: vi.fn().mockResolvedValue(BigInt(100000000)),
    transactionFee: vi.fn().mockResolvedValue(BigInt(10000)),
    transfer: vi.fn().mockResolvedValue(BigInt(12345)),
    queryBlocks: vi.fn().mockResolvedValue({
      blocks: [{ transaction: { operations: [] } }]
    })
  } as any);

  // Mock IcrcLedgerCanister
  const { IcrcLedgerCanister } = await import('@dfinity/ledger-icrc');
  vi.mocked(IcrcLedgerCanister.create).mockReturnValue({
    metadata: vi.fn().mockResolvedValue([['icrc1:decimals', { Nat: BigInt(8) }]]),
    balance: vi.fn().mockResolvedValue(BigInt(50000000)),
    transactionFee: vi.fn().mockResolvedValue(BigInt(1000)),
    transfer: vi.fn().mockResolvedValue(BigInt(54321))
  } as any);
}
