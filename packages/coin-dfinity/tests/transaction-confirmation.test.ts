import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IcpChainWallet } from '../src/chain-wallet/wallet';
import { Dfinity } from './test-chains';
import { TransactionConfirmationParams } from '@delandlabs/coin-base';

const testMnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';

// Mock dependencies
vi.mock('@dfinity/utils', () => ({
  createAgent: vi.fn()
}));

vi.mock('@dfinity/ledger-icp', () => ({
  LedgerCanister: {
    create: vi.fn()
  },
  AccountIdentifier: {
    fromPrincipal: vi.fn().mockReturnValue({
      toHex: vi.fn().mockReturnValue('mock-account-id')
    }),
    fromHex: vi.fn().mockReturnValue({})
  }
}));

vi.mock('@dfinity/ledger-icrc', () => ({
  IcrcLedgerCanister: {
    create: vi.fn()
  },
  IcrcMetadataResponseEntries: {
    DECIMALS: 'icrc1:decimals'
  }
}));

vi.mock('ic0', () => ({
  default: vi.fn()
}));

// Mock crypto library to provide valid key
vi.mock('@delandlabs/crypto-lib', async () => {
  const actual = await vi.importActual('@delandlabs/crypto-lib');
  return {
    ...actual,
    deriveEcdsaPrivateKey: vi.fn().mockResolvedValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
  };
});

describe('waitForConfirmationImpl', () => {
  let wallet: IcpChainWallet;
  let mockLedger: any;

  beforeEach(async () => {
    // Mock timers to avoid real delays in tests
    vi.useFakeTimers();

    // Setup mock ledger with queryBlocks method
    mockLedger = {
      queryBlocks: vi.fn(),
      accountBalance: vi.fn().mockResolvedValue(BigInt(100000000)),
      transactionFee: vi.fn().mockResolvedValue(BigInt(10000))
    };

    // Import and mock createAgent
    const { createAgent } = await import('@dfinity/utils');
    vi.mocked(createAgent).mockResolvedValue({
      call: vi.fn()
    } as any);

    // Mock LedgerCanister.create
    const { LedgerCanister } = await import('@dfinity/ledger-icp');
    vi.mocked(LedgerCanister.create).mockReturnValue(mockLedger);

    // Initialize IC mock
    const mockIc = vi.fn().mockReturnValue({
      call: vi.fn().mockResolvedValue([
        {
          name: 'ICRC-3',
          url: 'https://github.com/dfinity/ICRC-3'
        }
      ])
    });
    vi.mocked(await import('ic0')).default = mockIc;

    wallet = new IcpChainWallet(Dfinity, testMnemonic);

    // Wait for wallet initialization using timers
    await vi.runAllTimersAsync();

    // Skip real initialization by setting readyPromise to resolved
    (wallet as any).readyPromise = Promise.resolve();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Restore real timers
    vi.useRealTimers();

    if (wallet) {
      try {
        wallet.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
    vi.clearAllMocks();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  it('should confirm transaction when block exists', async () => {
    // Mock successful block query
    mockLedger.queryBlocks.mockResolvedValue({
      blocks: [
        {
          /* mock block data */
        }
      ]
    });

    const params: TransactionConfirmationParams = {
      txHash: '12345', // Block height as string
      requiredConfirmations: 1,
      timeoutMs: 5000
    };

    const result = await wallet.waitForConfirmation(params);

    expect(result.isConfirmed).toBe(true);
    expect(result.confirmations).toBe(1);
    expect(result.status).toBe('confirmed');
    expect(result.blockNumber).toBe(12345);
    expect(mockLedger.queryBlocks).toHaveBeenCalledWith({
      start: BigInt(12345),
      length: BigInt(1)
    });
  });

  it('should timeout when block does not exist', async () => {
    // Mock failed block query (block doesn't exist)
    mockLedger.queryBlocks.mockRejectedValue(new Error('Block not found'));

    const params: TransactionConfirmationParams = {
      txHash: '99999', // Non-existent block height
      requiredConfirmations: 1,
      timeoutMs: 5000 // 5 second timeout
    };

    // Start the confirmation process
    const confirmationPromise = wallet.waitForConfirmation(params);

    // Fast-forward past the timeout
    await vi.advanceTimersByTimeAsync(6000); // Advance beyond timeout

    const result = await confirmationPromise;

    expect(result.isConfirmed).toBe(false);
    expect(result.confirmations).toBe(0);
    expect(result.status).toBe('timeout');
    expect(mockLedger.queryBlocks).toHaveBeenCalled();
  });

  it('should call onConfirmationUpdate callback when transaction is confirmed', async () => {
    // Mock successful block query
    mockLedger.queryBlocks.mockResolvedValue({
      blocks: [
        {
          /* mock block data */
        }
      ]
    });

    const onConfirmationUpdate = vi.fn();
    const params: TransactionConfirmationParams = {
      txHash: '54321',
      requiredConfirmations: 1,
      timeoutMs: 5000,
      onConfirmationUpdate
    };

    const result = await wallet.waitForConfirmation(params);

    expect(result.isConfirmed).toBe(true);
    expect(onConfirmationUpdate).toHaveBeenCalledWith(1, 1);
  });

  it('should handle invalid transaction hash format', async () => {
    const params: TransactionConfirmationParams = {
      txHash: 'invalid-hash', // Invalid format
      requiredConfirmations: 1,
      timeoutMs: 5000
    };

    await expect(wallet.waitForConfirmation(params)).rejects.toThrow('Invalid transaction hash format');
  });

  it('should handle negative block height', async () => {
    const params: TransactionConfirmationParams = {
      txHash: '-123', // Negative block height
      requiredConfirmations: 1,
      timeoutMs: 5000
    };

    await expect(wallet.waitForConfirmation(params)).rejects.toThrow('Invalid transaction hash format');
  });

  it('should retry on temporary errors', async () => {
    // First call fails, second call succeeds
    mockLedger.queryBlocks.mockRejectedValueOnce(new Error('Temporary network error')).mockResolvedValueOnce({
      blocks: [
        {
          /* mock block data */
        }
      ]
    });

    const params: TransactionConfirmationParams = {
      txHash: '67890',
      requiredConfirmations: 1,
      timeoutMs: 10000
    };

    // Start the confirmation process
    const confirmationPromise = wallet.waitForConfirmation(params);

    // Fast-forward to trigger the first retry
    await vi.advanceTimersByTimeAsync(2500); // Advance past retry delay

    const result = await confirmationPromise;

    expect(result.isConfirmed).toBe(true);
    expect(mockLedger.queryBlocks).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple retries within timeout period', async () => {
    // Setup multiple failures followed by success
    mockLedger.queryBlocks
      .mockRejectedValueOnce(new Error('Network error 1'))
      .mockRejectedValueOnce(new Error('Network error 2'))
      .mockRejectedValueOnce(new Error('Network error 3'))
      .mockResolvedValueOnce({
        blocks: [
          {
            /* mock block data */
          }
        ]
      });

    const params: TransactionConfirmationParams = {
      txHash: '11111',
      requiredConfirmations: 1,
      timeoutMs: 15000 // 15 second timeout
    };

    // Start the confirmation process
    const confirmationPromise = wallet.waitForConfirmation(params);

    // Fast-forward through the retries (each retry has 2s delay)
    await vi.advanceTimersByTimeAsync(8000); // Advance enough for multiple retries

    const result = await confirmationPromise;

    expect(result.isConfirmed).toBe(true);
    expect(mockLedger.queryBlocks).toHaveBeenCalledTimes(4); // 3 failures + 1 success
  });

  it('should timeout after many retries', async () => {
    // Always fail
    mockLedger.queryBlocks.mockRejectedValue(new Error('Persistent network error'));

    const params: TransactionConfirmationParams = {
      txHash: '22222',
      requiredConfirmations: 1,
      timeoutMs: 3000 // 3 second timeout
    };

    // Start the confirmation process
    const confirmationPromise = wallet.waitForConfirmation(params);

    // Fast-forward past the timeout
    await vi.advanceTimersByTimeAsync(4000); // Advance beyond timeout

    const result = await confirmationPromise;

    expect(result.isConfirmed).toBe(false);
    expect(result.confirmations).toBe(0);
    expect(result.status).toBe('timeout');
    // Should have made multiple attempts
    expect(mockLedger.queryBlocks).toHaveBeenCalled();
  });
});
