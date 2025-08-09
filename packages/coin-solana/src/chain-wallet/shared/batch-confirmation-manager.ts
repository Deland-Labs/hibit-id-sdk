import { SignatureStatus } from '@solana/web3.js';
import { ILogger, TransactionConfirmationParams, TransactionConfirmationResult } from '@delandlabs/coin-base';
import { ConnectionManager } from './connection-manager';
import { DEFAULT_CONFIRMATION_STRATEGY } from '../config';
import BigNumber from 'bignumber.js';

/**
 * Batch confirmation request
 */
interface BatchConfirmationRequest {
  params: TransactionConfirmationParams;
  resolve: (result: TransactionConfirmationResult) => void;
  addedAt: number;
}

/**
 * Manages batch querying of transaction confirmations for improved efficiency.
 *
 * This class batches multiple confirmation requests into single RPC calls,
 * reducing network overhead and improving performance when monitoring
 * multiple transactions simultaneously.
 */
export class BatchConfirmationManager {
  private readonly connectionManager: ConnectionManager;
  private readonly logger: ILogger;
  private readonly batchSize: number;
  private readonly batchDelayMs: number = 100; // Delay to accumulate batch

  private pendingRequests: Map<string, BatchConfirmationRequest[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor(
    connectionManager: ConnectionManager,
    logger: ILogger,
    batchSize: number = DEFAULT_CONFIRMATION_STRATEGY.batchSize
  ) {
    this.connectionManager = connectionManager;
    this.logger = logger;
    this.batchSize = batchSize;
  }

  /**
   * Add a transaction to the batch confirmation queue
   */
  async addToBatch(params: TransactionConfirmationParams): Promise<TransactionConfirmationResult> {
    return new Promise<TransactionConfirmationResult>((resolve) => {
      const request: BatchConfirmationRequest = {
        params,
        resolve,
        addedAt: Date.now()
      };

      // Add to pending requests
      const requests = this.pendingRequests.get(params.txHash) || [];
      requests.push(request);
      this.pendingRequests.set(params.txHash, requests);

      this.logger.debug('Added transaction to batch', {
        context: 'BatchConfirmationManager.addToBatch',
        data: {
          txHash: params.txHash,
          batchSize: this.pendingRequests.size
        }
      });

      // Schedule batch processing
      this.scheduleBatchProcessing();

      // Set individual timeout for this request
      setTimeout(() => {
        // Check if still pending
        const pendingReqs = this.pendingRequests.get(params.txHash);
        if (pendingReqs && pendingReqs.includes(request)) {
          // Remove from pending and resolve with timeout
          this.pendingRequests.set(
            params.txHash,
            pendingReqs.filter((r) => r !== request)
          );

          resolve({
            isConfirmed: false,
            confirmations: 0,
            requiredConfirmations: params.requiredConfirmations || 1,
            status: 'timeout',
            blockHash: undefined,
            blockNumber: undefined
          });
        }
      }, params.timeoutMs || 90000);
    });
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    // If already processing or timer set, skip
    if (this.isProcessing || this.batchTimer) {
      return;
    }

    // If batch is full, process immediately
    if (this.pendingRequests.size >= this.batchSize) {
      this.processBatch();
      return;
    }

    // Otherwise, schedule with delay
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, this.batchDelayMs);
  }

  /**
   * Process pending batch
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.pendingRequests.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get signatures to query (up to batch size)
      const signatures = Array.from(this.pendingRequests.keys()).slice(0, this.batchSize);

      this.logger.debug('Processing confirmation batch', {
        context: 'BatchConfirmationManager.processBatch',
        data: {
          batchSize: signatures.length
        }
      });

      // Query all signatures at once
      const statuses = await this.connectionManager.getSignatureStatuses(signatures, {
        searchTransactionHistory: true
      });

      // Process results
      for (let i = 0; i < signatures.length; i++) {
        const signature = signatures[i];
        const status = statuses[i];
        const requests = this.pendingRequests.get(signature) || [];

        // Remove from pending
        this.pendingRequests.delete(signature);

        // Process each request for this signature
        for (const request of requests) {
          await this.processConfirmationResult(request, status);
        }
      }

      // Schedule next batch if more pending
      if (this.pendingRequests.size > 0) {
        this.scheduleBatchProcessing();
      }
    } catch (error) {
      this.logger.error(
        'Batch processing failed',
        {
          error: error instanceof Error ? error : new Error(String(error)),
          context: 'BatchConfirmationManager.processBatch'
        }
      );

      // On error, process individually as fallback
      for (const [signature, requests] of this.pendingRequests.entries()) {
        this.pendingRequests.delete(signature);

        for (const request of requests) {
          request.resolve({
            isConfirmed: false,
            confirmations: 0,
            requiredConfirmations: request.params.requiredConfirmations || 1,
            status: 'failed',
            blockHash: undefined,
            blockNumber: undefined
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process confirmation result for a request
   */
  private async processConfirmationResult(
    request: BatchConfirmationRequest,
    status: SignatureStatus | null
  ): Promise<void> {
    const { params, resolve } = request;

    try {
      if (!status) {
        // Transaction not found
        resolve({
          isConfirmed: false,
          confirmations: 0,
          requiredConfirmations: params.requiredConfirmations || 1,
          status: 'failed',
          blockHash: undefined,
          blockNumber: undefined
        });
        return;
      }

      // Check for failure
      if (status.err) {
        resolve({
          isConfirmed: false,
          confirmations: 0,
          requiredConfirmations: params.requiredConfirmations || 1,
          status: 'failed',
          blockHash: undefined,
          blockNumber: undefined
        });
        return;
      }

      // Calculate confirmations based on status
      const confirmations = this.calculateDefaultConfirmations(status);
      const requiredConfirmations = params.requiredConfirmations || 1;

      // Report progress if callback provided
      if (params.onConfirmationUpdate) {
        params.onConfirmationUpdate(confirmations, requiredConfirmations);
      }

      // Check if confirmed
      if (confirmations >= requiredConfirmations) {
        // Get additional details
        const txDetails = await this.connectionManager.getTransactionDetails(params.txHash);

        resolve({
          isConfirmed: true,
          confirmations,
          requiredConfirmations,
          status: 'confirmed',
          blockHash: txDetails?.transaction?.message
            ? (txDetails.transaction.message as any).recentBlockhash
            : undefined,
          blockNumber: txDetails?.slot,
          transactionFee: txDetails?.meta?.fee ? new BigNumber(txDetails.meta.fee).dividedBy(1000000000) : undefined
        });
      } else {
        // Not yet confirmed - would need to re-query
        resolve({
          isConfirmed: false,
          confirmations,
          requiredConfirmations,
          status: 'pending',
          blockHash: undefined,
          blockNumber: undefined
        });
      }
    } catch (error) {
      this.logger.error(
        'Failed to process confirmation result',
        {
          error: error instanceof Error ? error : new Error(String(error)),
          context: 'BatchConfirmationManager.processConfirmationResult',
          data: { txHash: params.txHash }
        }
      );

      resolve({
        isConfirmed: false,
        confirmations: 0,
        requiredConfirmations: params.requiredConfirmations || 1,
        status: 'failed',
        blockHash: undefined,
        blockNumber: undefined
      });
    }
  }

  /**
   * Calculate default confirmations from status
   */
  private calculateDefaultConfirmations(status: SignatureStatus): number {
    if (status.confirmationStatus === 'finalized') {
      return 10;
    } else if (status.confirmationStatus === 'confirmed') {
      return 3;
    } else if (status.confirmationStatus === 'processed') {
      return 1;
    }
    return 0;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Resolve all pending with timeout
    for (const requests of this.pendingRequests.values()) {
      for (const request of requests) {
        request.resolve({
          isConfirmed: false,
          confirmations: 0,
          requiredConfirmations: request.params.requiredConfirmations || 1,
          status: 'timeout',
          blockHash: undefined,
          blockNumber: undefined
        });
      }
    }

    this.pendingRequests.clear();
  }
}
