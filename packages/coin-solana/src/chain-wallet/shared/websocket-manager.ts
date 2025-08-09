import { Connection, SignatureStatus, Commitment } from '@solana/web3.js';
import { ILogger, NetworkError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';
import { CHAIN_NAME, DEFAULT_COMMITMENT } from '../config';

/**
 * Subscription callback type
 */
export type SignatureStatusCallback = (status: SignatureStatus | null, error?: Error) => void;

/**
 * Subscription info
 */
interface SubscriptionInfo {
  signature: string;
  callback: SignatureStatusCallback;
  subscriptionId: number;
  createdAt: number;
  commitment: Commitment;
}

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
  subscriptionTimeoutMs?: number;
  enableAutoReconnect?: boolean;
}

/**
 * Manages WebSocket connections for real-time transaction status updates.
 *
 * This class provides efficient real-time monitoring of transaction confirmations
 * using Solana's WebSocket API, reducing latency and network overhead compared
 * to polling-based approaches.
 *
 * Features:
 * - Automatic reconnection on connection loss
 * - Subscription lifecycle management
 * - Error handling and fallback mechanisms
 * - Connection health monitoring
 */
export class WebSocketManager {
  private readonly connection: Connection;
  private readonly logger: ILogger;
  private readonly config: Required<WebSocketConfig>;
  private readonly subscriptions: Map<string, SubscriptionInfo>;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;

  constructor(connection: Connection, logger: ILogger, config?: WebSocketConfig) {
    this.connection = connection;
    this.logger = logger;
    this.subscriptions = new Map();

    // Apply default configuration
    this.config = {
      maxReconnectAttempts: config?.maxReconnectAttempts ?? 5,
      reconnectDelayMs: config?.reconnectDelayMs ?? 1000,
      subscriptionTimeoutMs: config?.subscriptionTimeoutMs ?? 120000, // 2 minutes
      enableAutoReconnect: config?.enableAutoReconnect ?? true
    };
  }

  // ============================================================
  // Public Methods
  // ============================================================

  /**
   * Subscribe to signature status updates
   * @returns Subscription ID that can be used to unsubscribe
   */
  async subscribeSignature(
    signature: string,
    callback: SignatureStatusCallback,
    commitment: Commitment = DEFAULT_COMMITMENT
  ): Promise<number> {
    try {
      // Check if already subscribed to this signature
      const existing = this.subscriptions.get(signature);
      if (existing) {
        this.logger.debug('Signature already subscribed, updating callback', {
          context: 'WebSocketManager.subscribeSignature',
          data: {
            signature
          }
        });

        // Update callback and return existing subscription
        existing.callback = callback;
        return existing.subscriptionId;
      }

      // Create WebSocket subscription
      const subscriptionId = this.connection.onSignature(
        signature,
        (result, context) => {
          this.handleSignatureUpdate(signature, result, context);
        },
        commitment
      );

      // Store subscription info
      const subscriptionInfo: SubscriptionInfo = {
        signature,
        callback,
        subscriptionId,
        createdAt: Date.now(),
        commitment
      };

      this.subscriptions.set(signature, subscriptionInfo);
      this.isConnected = true;

      this.logger.debug('Subscribed to signature updates', {
        context: 'WebSocketManager.subscribeSignature',
        data: {
          signature,
          subscriptionId,
          commitment
        }
      });

      // Set up subscription timeout
      this.setupSubscriptionTimeout(signature);

      return subscriptionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to subscribe to signature',
        {
          error: error instanceof Error ? error : new Error(errorMessage),
          context: 'WebSocketManager.subscribeSignature',
          data: { signature }
        }
      );

      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_NAME}: Failed to subscribe to signature updates: ${errorMessage}`
      );
    }
  }

  /**
   * Unsubscribe from signature updates
   */
  async unsubscribe(subscriptionId: number): Promise<void> {
    try {
      // Find subscription by ID
      let signatureToRemove: string | undefined;
      for (const [signature, info] of this.subscriptions.entries()) {
        if (info.subscriptionId === subscriptionId) {
          signatureToRemove = signature;
          break;
        }
      }

      if (!signatureToRemove) {
        this.logger.warn('Subscription not found', {
          context: 'WebSocketManager.unsubscribe',
          data: { subscriptionId }
        });
        return;
      }

      // Remove WebSocket subscription
      await this.connection.removeSignatureListener(subscriptionId);

      // Remove from tracking
      this.subscriptions.delete(signatureToRemove);

      this.logger.debug('Unsubscribed from signature updates', {
        context: 'WebSocketManager.unsubscribe',
        data: {
          signature: signatureToRemove,
          subscriptionId
        }
      });

      // Update connection status
      if (this.subscriptions.size === 0) {
        this.isConnected = false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to unsubscribe',
        {
          error: error instanceof Error ? error : new Error(errorMessage),
          context: 'WebSocketManager.unsubscribe',
          data: { subscriptionId }
        }
      );
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  async unsubscribeAll(): Promise<void> {
    const subscriptionIds = Array.from(this.subscriptions.values()).map((info) => info.subscriptionId);

    for (const subscriptionId of subscriptionIds) {
      await this.unsubscribe(subscriptionId);
    }
  }

  /**
   * Check if WebSocket is connected and has active subscriptions
   */
  isActive(): boolean {
    return this.isConnected && this.subscriptions.size > 0;
  }

  /**
   * Get number of active subscriptions
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    // Cancel reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Unsubscribe from all
    await this.unsubscribeAll();

    this.isConnected = false;
    this.reconnectAttempts = 0;

    this.logger.debug('WebSocket manager cleaned up', {
      context: 'WebSocketManager.cleanup'
    });
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Handle signature status update from WebSocket
   */
  private handleSignatureUpdate(signature: string, result: any, context: any): void {
    const subscription = this.subscriptions.get(signature);
    if (!subscription) {
      this.logger.warn('Received update for unknown signature', {
        context: 'WebSocketManager.handleSignatureUpdate',
        data: {
          signature
        }
      });
      return;
    }

    try {
      // Convert result to SignatureStatus format
      const status: SignatureStatus = {
        slot: context.slot,
        confirmations: null,
        err: result.err || null,
        confirmationStatus: this.getConfirmationStatus(result, subscription.commitment)
      };

      this.logger.debug('Signature status updated', {
        context: 'WebSocketManager.handleSignatureUpdate',
        data: {
          signature,
          slot: status.slot,
          confirmationStatus: status.confirmationStatus || 'unknown',
          err: status.err ? 'Transaction failed' : null
        }
      });

      // Invoke callback
      subscription.callback(status);

      // Auto-unsubscribe if transaction is finalized or failed
      if (status.confirmationStatus === 'finalized' || status.err) {
        this.unsubscribe(subscription.subscriptionId).catch((error) => {
          this.logger.error(
            'Failed to auto-unsubscribe',
            {
              error: error instanceof Error ? error : new Error(String(error)),
              context: 'WebSocketManager.handleSignatureUpdate',
              data: { signature }
            }
          );
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Error handling signature update',
        {
          error: error instanceof Error ? error : new Error(errorMessage),
          context: 'WebSocketManager.handleSignatureUpdate',
          data: { signature }
        }
      );

      // Notify callback of error
      const callbackError = error instanceof Error ? error : new Error(errorMessage);
      subscription.callback(null, callbackError);
    }
  }

  /**
   * Determine confirmation status from result
   */
  private getConfirmationStatus(
    result: any,
    commitment: Commitment
  ): 'processed' | 'confirmed' | 'finalized' | undefined {
    // If error, no confirmation status
    if (result.err) {
      return undefined;
    }

    // Map commitment level to confirmation status
    switch (commitment) {
      case 'processed':
        return 'processed';
      case 'confirmed':
        return 'confirmed';
      case 'finalized':
      case 'max':
      case 'root':
        return 'finalized';
      default:
        return 'confirmed';
    }
  }

  /**
   * Set up timeout for subscription
   */
  private setupSubscriptionTimeout(signature: string): void {
    const subscription = this.subscriptions.get(signature);
    if (!subscription) {
      return;
    }

    // Set timeout to clean up stale subscriptions
    setTimeout(() => {
      if (this.subscriptions.has(signature)) {
        this.logger.warn('Subscription timeout reached, cleaning up', {
          context: 'WebSocketManager.setupSubscriptionTimeout',
          data: {
            signature
          }
        });

        // Notify callback of timeout
        subscription.callback(null, new Error('Subscription timeout'));

        // Unsubscribe
        this.unsubscribe(subscription.subscriptionId).catch((error) => {
          this.logger.error(
            'Failed to cleanup timed out subscription',
            {
              error: error instanceof Error ? error : new Error(String(error)),
              context: 'WebSocketManager.setupSubscriptionTimeout',
              data: { signature }
            }
          );
        });
      }
    }, this.config.subscriptionTimeoutMs);
  }

  /**
   * Handle connection errors and attempt reconnection
   */
  private handleConnectionError(error: Error): void {
    this.logger.error('WebSocket connection error', {
      error,
      context: 'WebSocketManager.handleConnectionError'
    });

    this.isConnected = false;

    if (this.config.enableAutoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      // Notify all subscriptions of connection loss
      for (const subscription of this.subscriptions.values()) {
        subscription.callback(null, new Error('WebSocket connection lost'));
      }

      // Clear all subscriptions
      this.subscriptions.clear();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const delay = this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.logger.info('Scheduling WebSocket reconnection', {
      context: 'WebSocketManager.scheduleReconnect',
      data: {
        attempt: this.reconnectAttempts,
        delayMs: delay
      }
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptReconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect and restore subscriptions
   */
  private async attemptReconnect(): Promise<void> {
    try {
      // Re-subscribe to all signatures
      const subscriptionsToRestore = Array.from(this.subscriptions.entries());

      for (const [signature, info] of subscriptionsToRestore) {
        try {
          const newSubscriptionId = await this.connection.onSignature(
            signature,
            (result, context) => {
              this.handleSignatureUpdate(signature, result, context);
            },
            info.commitment
          );

          // Update subscription ID
          info.subscriptionId = newSubscriptionId;

          this.logger.debug('Restored subscription', {
            context: 'WebSocketManager.attemptReconnect',
            data: {
              signature,
              newSubscriptionId
            }
          });
        } catch (error) {
          this.logger.error(
            'Failed to restore subscription',
            {
              error: error instanceof Error ? error : new Error(String(error)),
              context: 'WebSocketManager.attemptReconnect',
              data: { signature }
            }
          );

          // Remove failed subscription
          this.subscriptions.delete(signature);

          // Notify callback
          const restoreError = error instanceof Error ? error : new Error('Failed to restore subscription');
          info.callback(null, restoreError);
        }
      }

      // Reset reconnect attempts on success
      if (this.subscriptions.size > 0) {
        this.isConnected = true;
        this.reconnectAttempts = 0;

        this.logger.info('WebSocket reconnection successful', {
          context: 'WebSocketManager.attemptReconnect',
          data: {
            restoredSubscriptions: this.subscriptions.size
          }
        });
      }
    } catch (error) {
      this.logger.error(
        'Reconnection attempt failed',
        {
          error: error instanceof Error ? error : new Error(String(error)),
          context: 'WebSocketManager.attemptReconnect'
        }
      );

      const reconnectError = error instanceof Error ? error : new Error('Reconnection failed');
      this.handleConnectionError(reconnectError);
    }
  }
}
