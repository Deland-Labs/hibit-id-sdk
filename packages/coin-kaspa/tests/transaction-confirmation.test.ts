import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KaspaChainWallet } from '../src/chain-wallet/wallet';
import { Kaspa } from './test-chains';
import { TransactionConfirmationParams } from '@delandlabs/coin-base';
import './setup';

describe('KaspaChainWallet Transaction Confirmation', () => {
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  let wallet: KaspaChainWallet;

  beforeEach(async () => {
    vi.useFakeTimers();
    wallet = new KaspaChainWallet(Kaspa, testMnemonic);

    // Wait for wallet initialization
    await vi.runAllTimersAsync();

    // Ensure wallet is ready
    (wallet as any).readyPromise = Promise.resolve();
  });

  afterEach(() => {
    vi.useRealTimers();
    wallet.destroy();
  });

  describe('waitForConfirmation method', () => {
    it('should have waitForConfirmation method implemented', () => {
      // Verify the method exists
      expect(typeof wallet.waitForConfirmation).toBe('function');
    });

    it('should handle transaction confirmation successfully', async () => {
      // Mock the waitForChainConfirmation method to return confirmed result
      vi.spyOn(wallet as any, 'waitForChainConfirmation').mockResolvedValue({
        isConfirmed: true,
        confirmations: 3,
        requiredConfirmations: 1,
        status: 'confirmed',
        blockHash: 'mock-block-hash',
        blockNumber: 12345
      });

      // Mock checkMempoolStatus
      vi.spyOn(wallet as any, 'checkMempoolStatus').mockResolvedValue(undefined);

      const params: TransactionConfirmationParams = {
        txHash: 'test-tx-hash',
        requiredConfirmations: 1,
        timeoutMs: 5000
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.confirmations).toBe(3);
      expect(result.status).toBe('confirmed');
      expect(result.blockHash).toBe('mock-block-hash');
      expect(result.blockNumber).toBe(12345);
    });

    it('should handle transaction timeout', async () => {
      // Mock the waitForChainConfirmation method to return timeout result
      vi.spyOn(wallet as any, 'waitForChainConfirmation').mockResolvedValue({
        isConfirmed: false,
        confirmations: 0,
        requiredConfirmations: 1,
        status: 'timeout',
        blockHash: undefined,
        blockNumber: undefined
      });

      // Mock checkMempoolStatus to show transaction in mempool
      vi.spyOn(wallet as any, 'checkMempoolStatus').mockResolvedValue(undefined);

      const params: TransactionConfirmationParams = {
        txHash: 'test-tx-hash',
        requiredConfirmations: 1,
        timeoutMs: 100 // Very short timeout
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(false);
      expect(result.confirmations).toBe(0);
      expect(result.status).toBe('timeout');
    });

    it('should handle virtual chain events', async () => {
      // Mock the waitForChainConfirmation to simulate multiple confirmations
      vi.spyOn(wallet as any, 'waitForChainConfirmation').mockResolvedValue({
        isConfirmed: true,
        confirmations: 5,
        requiredConfirmations: 2,
        status: 'confirmed',
        blockHash: 'mock-block-hash',
        blockNumber: 12350
      });

      vi.spyOn(wallet as any, 'checkMempoolStatus').mockResolvedValue(undefined);

      const params: TransactionConfirmationParams = {
        txHash: 'test-tx-hash',
        requiredConfirmations: 2,
        timeoutMs: 5000
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.confirmations).toBeGreaterThanOrEqual(2);
      expect(result.status).toBe('confirmed');
    });

    it('should call onConfirmationUpdate callback', async () => {
      const onConfirmationUpdate = vi.fn();

      // Mock checkMempoolStatus to call the callback
      vi.spyOn(wallet as any, 'checkMempoolStatus').mockImplementation(async (...args: any[]) => {
        const required = args[1];
        const callback = args[2];
        if (callback) {
          callback(0, required); // Transaction in mempool
        }
      });

      // Mock waitForChainConfirmation to also call the callback
      vi.spyOn(wallet as any, 'waitForChainConfirmation').mockImplementation(async (...args: any[]) => {
        const required = args[1];
        const callback = args[3];
        if (callback) {
          // Simulate progress updates
          callback(1, required);
          callback(2, required);
          callback(3, required);
        }
        return {
          isConfirmed: true,
          confirmations: 3,
          requiredConfirmations: required,
          status: 'confirmed' as const,
          blockHash: 'mock-block-hash',
          blockNumber: 12345
        };
      });

      const params: TransactionConfirmationParams = {
        txHash: 'test-tx-hash',
        requiredConfirmations: 3,
        timeoutMs: 5000,
        onConfirmationUpdate
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(onConfirmationUpdate).toHaveBeenCalled();

      // Should have been called multiple times with progress updates
      expect(onConfirmationUpdate).toHaveBeenCalledWith(0, 3); // In mempool
      expect(onConfirmationUpdate).toHaveBeenCalledWith(1, 3); // 1 confirmation
      expect(onConfirmationUpdate).toHaveBeenCalledWith(2, 3); // 2 confirmations
      expect(onConfirmationUpdate).toHaveBeenCalledWith(3, 3); // 3 confirmations (confirmed)
    });

    it('should handle failed transaction', async () => {
      // Mock the waitForChainConfirmation to check initial block and return failed
      vi.spyOn(wallet as any, 'waitForChainConfirmation').mockImplementation(async () => {
        // Simulate the performInitialBlockCheck returning a failed transaction
        return {
          isConfirmed: false,
          confirmations: 0,
          requiredConfirmations: 1,
          status: 'failed' as const,
          blockHash: 'mock-block-hash',
          blockNumber: 12345
        };
      });

      // Mock checkMempoolStatus
      vi.spyOn(wallet as any, 'checkMempoolStatus').mockResolvedValue(undefined);

      const params: TransactionConfirmationParams = {
        txHash: 'test-tx-hash',
        requiredConfirmations: 1,
        timeoutMs: 5000
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(false);
      expect(result.status).toBe('failed');
    });
  });
});
