import 'reflect-metadata';
import './setup';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { TronChainWallet } from '../src/chain-wallet/wallet';
import { Tron } from './test-chains';
import { TransactionConfirmationParams } from '@delandlabs/coin-base';

describe('TRON Transaction Confirmation (Mocked)', () => {
  let wallet: TronChainWallet;
  const testMnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';

  beforeEach(() => {
    wallet = new TronChainWallet(Tron, testMnemonic);
  });

  describe('waitForConfirmation with Mocked TronWeb', () => {
    test('should handle confirmed transaction', async () => {
      // Mock the connection manager to return mocked TronWeb
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;

      connectionManager.getTronWeb = () => ({
        trx: {
          getTransactionInfo: vi.fn().mockResolvedValue({
            result: 'SUCCESS',
            blockNumber: 100,
            fee: 1000000 // 1 TRX in SUN
          }),
          getTransaction: vi.fn().mockResolvedValue({
            txID: 'test-tx-id'
          }),
          getCurrentBlock: vi.fn().mockResolvedValue({
            block_header: {
              raw_data: {
                number: 102 // 3 confirmations
              }
            }
          })
        }
      });

      const params: TransactionConfirmationParams = {
        txHash: 'confirmed-tx-hash',
        requiredConfirmations: 2,
        timeoutMs: 5000
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.confirmations).toBe(3);
      expect(result.status).toBe('confirmed');
      expect(result.blockNumber).toBe(100);
      expect(result.transactionFee?.toString()).toBe('1');

      // Restore original
      connectionManager.getTronWeb = originalGetTronWeb;
    });

    test('should handle failed transaction', async () => {
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;

      connectionManager.getTronWeb = () => ({
        trx: {
          getTransactionInfo: vi.fn().mockResolvedValue({
            result: 'FAILED',
            blockNumber: 100,
            fee: 500000
          }),
          getTransaction: vi.fn().mockResolvedValue({
            txID: 'failed-tx-id'
          })
        }
      });

      const params: TransactionConfirmationParams = {
        txHash: 'failed-tx-hash',
        requiredConfirmations: 1,
        timeoutMs: 5000
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.confirmations).toBe(0);

      connectionManager.getTronWeb = originalGetTronWeb;
    });

    test('should handle pending transaction with progress updates', async () => {
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;

      let callCount = 0;
      const confirmationUpdates: Array<{ confirmations: number; required: number }> = [];

      connectionManager.getTronWeb = () => ({
        trx: {
          getTransactionInfo: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount <= 2) {
              return Promise.resolve({
                result: 'SUCCESS',
                blockNumber: 100,
                fee: 1000000
              });
            } else {
              return Promise.resolve({
                result: 'SUCCESS',
                blockNumber: 100,
                fee: 1000000
              });
            }
          }),
          getTransaction: vi.fn().mockResolvedValue({
            txID: 'pending-tx-id'
          }),
          getCurrentBlock: vi.fn().mockResolvedValue({
            block_header: { raw_data: { number: 102 } } // 3 confirmations (102 - 100 + 1 = 3)
          })
        }
      });

      const params: TransactionConfirmationParams = {
        txHash: 'pending-tx-hash',
        requiredConfirmations: 3,
        timeoutMs: 5000,
        onConfirmationUpdate: (confirmations, required) => {
          confirmationUpdates.push({ confirmations, required });
        }
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.status).toBe('confirmed');
      expect(confirmationUpdates.length).toBeGreaterThan(0);

      connectionManager.getTronWeb = originalGetTronWeb;
    });

    test('should timeout for non-existent transaction', async () => {
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;

      connectionManager.getTronWeb = () => ({
        trx: {
          getTransactionInfo: vi.fn().mockRejectedValue(new Error('Transaction not found')),
          getTransaction: vi.fn().mockResolvedValue(null)
        }
      });

      const params: TransactionConfirmationParams = {
        txHash: 'non-existent-tx-hash',
        requiredConfirmations: 1,
        timeoutMs: 2000 // Short timeout
      };

      const startTime = Date.now();
      const result = await wallet.waitForConfirmation(params);
      const duration = Date.now() - startTime;

      expect(result.isConfirmed).toBe(false);
      expect(result.status).toBe('timeout');
      expect(duration).toBeGreaterThanOrEqual(2000);
      expect(duration).toBeLessThan(3000); // Should not exceed timeout significantly

      connectionManager.getTronWeb = originalGetTronWeb;
    });

    test('should use default parameters correctly', async () => {
      const connectionManager = (wallet as any).connectionManager;
      const originalGetTronWeb = connectionManager.getTronWeb;

      connectionManager.getTronWeb = () => ({
        trx: {
          getTransactionInfo: vi.fn().mockResolvedValue({
            result: 'SUCCESS',
            blockNumber: 100,
            fee: 1000000
          }),
          getTransaction: vi.fn().mockResolvedValue({
            txID: 'test-tx-id'
          }),
          getCurrentBlock: vi.fn().mockResolvedValue({
            block_header: {
              raw_data: {
                number: 101 // 2 confirmations
              }
            }
          })
        }
      });

      const params: TransactionConfirmationParams = {
        txHash: 'test-tx-hash'
        // No requiredConfirmations (default: 1) or timeoutMs (default: 60000)
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.confirmations).toBe(2);
      expect(result.requiredConfirmations).toBe(1); // Default value
      expect(result.status).toBe('confirmed');

      connectionManager.getTronWeb = originalGetTronWeb;
    });
  });
});
