import { expect, test, describe, vi, beforeEach } from 'vitest';
import { EthereumChainWallet } from '../src/chain-wallet/wallet';
import { Ethereum } from './test-chains';
import { getWalletInternals } from './test-utils';
import BigNumber from 'bignumber.js';
import './setup';

const testMnemonic = 'test test test test test test test test test test test junk';
const testTxHash = '0x1234567890123456789012345678901234567890123456789012345678901234';

describe('waitForConfirmationImpl', () => {
  let wallet: EthereumChainWallet;
  let mockProvider: any;

  beforeEach(async () => {
    wallet = new EthereumChainWallet(Ethereum, testMnemonic);

    // Wait for wallet initialization
    await wallet.getAccount();

    // Get internals and mock provider
    const internals = getWalletInternals(wallet);

    // Mock provider with waitForTransaction method
    mockProvider = {
      waitForTransaction: vi.fn(),
      getBlockNumber: vi.fn(),
      getTransactionReceipt: vi.fn(),
      _isProvider: true
    };

    vi.spyOn(internals.connectionManager, 'getProvider').mockReturnValue(mockProvider);
  });

  test('should handle successful transaction confirmation', async () => {
    // Mock successful transaction receipt
    const mockReceipt = {
      status: 1, // Success
      blockHash: '0xabcd1234',
      blockNumber: 1000,
      gasUsed: 21000n,
      gasPrice: 20000000000n
    };

    mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);
    mockProvider.getBlockNumber.mockResolvedValue(1002); // 3 confirmations

    const result = await wallet.waitForConfirmation({
      txHash: testTxHash,
      requiredConfirmations: 1
    });

    expect(result.isConfirmed).toBe(true);
    expect(result.status).toBe('confirmed');
    expect(result.confirmations).toBe(3);
    expect(result.blockHash).toBe('0xabcd1234');
    expect(result.blockNumber).toBe(1000);
    expect(result.gasUsed).toBe(21000n);
    expect(result.transactionFee).toEqual(new BigNumber('420000000000000'));

    // Verify provider method was called with correct parameters
    expect(mockProvider.waitForTransaction).toHaveBeenCalledWith(testTxHash, 1, 300000);
  });

  test('should handle failed transaction', async () => {
    // Mock failed transaction receipt
    const mockReceipt = {
      status: 0, // Failed
      blockHash: '0xabcd1234',
      blockNumber: 1000,
      gasUsed: 21000n,
      gasPrice: 20000000000n
    };

    mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);
    mockProvider.getBlockNumber.mockResolvedValue(1002);

    const result = await wallet.waitForConfirmation({
      txHash: testTxHash,
      requiredConfirmations: 1
    });

    expect(result.isConfirmed).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.confirmations).toBe(3);
    expect(result.gasUsed).toBe(21000n);
  });

  test('should handle timeout scenario', async () => {
    // Mock timeout (provider returns null)
    mockProvider.waitForTransaction.mockResolvedValue(null);

    const result = await wallet.waitForConfirmation({
      txHash: testTxHash,
      requiredConfirmations: 1,
      timeoutMs: 1000 // Short timeout for test
    });

    expect(result.isConfirmed).toBe(false);
    expect(result.status).toBe('timeout');
    expect(result.confirmations).toBe(0);

    // Verify provider method was called with correct timeout
    expect(mockProvider.waitForTransaction).toHaveBeenCalledWith(testTxHash, 1, 1000);
  });

  test('should handle custom confirmations and timeout', async () => {
    const mockReceipt = {
      status: 1,
      blockHash: '0xabcd1234',
      blockNumber: 1000,
      gasUsed: 21000n,
      gasPrice: 20000000000n
    };

    mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);
    mockProvider.getBlockNumber.mockResolvedValue(1005); // 6 confirmations

    const result = await wallet.waitForConfirmation({
      txHash: testTxHash,
      requiredConfirmations: 6,
      timeoutMs: 600000 // 10 minutes
    });

    expect(result.isConfirmed).toBe(true);
    expect(result.confirmations).toBe(6);
    expect(result.requiredConfirmations).toBe(6);

    // Verify provider method was called with custom parameters
    expect(mockProvider.waitForTransaction).toHaveBeenCalledWith(testTxHash, 6, 600000);
  });

  test('should call progress callback when provided', async () => {
    const mockReceipt = {
      status: 1,
      blockHash: '0xabcd1234',
      blockNumber: 1000,
      gasUsed: 21000n,
      gasPrice: 20000000000n
    };

    mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);
    mockProvider.getBlockNumber.mockResolvedValue(1003); // 4 confirmations

    const progressCallback = vi.fn();

    await wallet.waitForConfirmation({
      txHash: testTxHash,
      requiredConfirmations: 3,
      onConfirmationUpdate: progressCallback
    });

    // Verify callback was called with current and required confirmations
    expect(progressCallback).toHaveBeenCalledWith(4, 3);
  });

  test('should use default values when optional parameters not provided', async () => {
    const mockReceipt = {
      status: 1,
      blockHash: '0xabcd1234',
      blockNumber: 1000,
      gasUsed: 21000n,
      gasPrice: 20000000000n
    };

    mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);
    mockProvider.getBlockNumber.mockResolvedValue(1001);

    await wallet.waitForConfirmation({
      txHash: testTxHash
      // No requiredConfirmations or timeoutMs specified
    });

    // Verify default values were used
    expect(mockProvider.waitForTransaction).toHaveBeenCalledWith(testTxHash, 1, 300000);
  });

  test('should handle provider errors gracefully', async () => {
    // Mock provider to throw error
    mockProvider.waitForTransaction.mockRejectedValue(new Error('Network error'));

    // The error should be propagated (handled by BaseChainWallet decorators)
    await expect(
      wallet.waitForConfirmation({
        txHash: testTxHash
      })
    ).rejects.toThrow('Network error');
  });

  test('should handle pending transaction (insufficient confirmations)', async () => {
    const mockReceipt = {
      status: 1, // Success but not enough confirmations
      blockHash: '0xabcd1234',
      blockNumber: 1000,
      gasUsed: 21000n,
      gasPrice: 20000000000n
    };

    mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);
    mockProvider.getBlockNumber.mockResolvedValue(1001); // Only 2 confirmations

    const result = await wallet.waitForConfirmation({
      txHash: testTxHash,
      requiredConfirmations: 5 // Need 5 confirmations
    });

    expect(result.isConfirmed).toBe(false);
    expect(result.status).toBe('pending');
    expect(result.confirmations).toBe(2);
    expect(result.requiredConfirmations).toBe(5);
  });
});
