import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  Commitment,
  SignatureStatus
} from '@solana/web3.js';
import { ChainInfo, NetworkError, TransactionError, HibitIdSdkErrorCode, ILogger } from '@delandlabs/coin-base';
import { CHAIN_NAME, DEFAULT_COMMITMENT } from '../config';
import { WebSocketManager, SignatureStatusCallback, WebSocketConfig } from './websocket-manager';

/**
 * Wallet information interface
 */
export interface SolanaWalletInfo {
  keypair: Keypair;
  address: string;
}

/**
 * Extended transfer parameters for Solana-specific features
 */
export interface ExtendedTransferParams {
  priorityFee?: number; // in microLamports
  simulateBeforeSend?: boolean;
}

/**
 * Manages Solana connection and wallet information for blockchain operations.
 *
 * This class centralizes connection management and provides a single point of access
 * to the Solana connection and wallet information for all asset handlers.
 *
 * Enhanced with WebSocket support for real-time transaction monitoring.
 */
export class ConnectionManager {
  // Private fields
  private connection: Connection | null = null;
  private walletInfo: SolanaWalletInfo | null = null;
  private webSocketManager: WebSocketManager | null = null;
  private readonly chainInfo: ChainInfo;
  private readonly logger: ILogger;
  private readonly webSocketConfig: WebSocketConfig;

  constructor(chainInfo: ChainInfo, logger: ILogger, webSocketConfig?: WebSocketConfig) {
    this.chainInfo = chainInfo;
    this.logger = logger;
    this.webSocketConfig = webSocketConfig || {};
  }

  // ============================================================
  // Public Methods
  // ============================================================

  /**
   * Initialize the connection manager with Solana connection and wallet information
   */
  initialize(walletInfo: SolanaWalletInfo): void {
    try {
      // Initialize Solana connection
      const rpcUrl = this.getRpcUrl();
      this.connection = new Connection(rpcUrl, DEFAULT_COMMITMENT);

      // Store wallet information
      this.walletInfo = walletInfo;

      // Initialize WebSocket manager if enabled
      if (this.webSocketConfig.enableAutoReconnect !== false) {
        this.webSocketManager = new WebSocketManager(this.connection, this.logger, this.webSocketConfig);
      }

      this.logger.debug('Connection manager initialized', {
        context: 'ConnectionManager.initialize',
        data: {
          rpcUrl,
          address: walletInfo.address,
          webSocketEnabled: this.webSocketManager !== null
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_NAME}: Failed to initialize connection manager: ${errorMessage}`
      );
    }
  }

  /**
   * Get the Solana connection instance
   */
  getConnection(): Connection {
    if (!this.connection) {
      throw new NetworkError(HibitIdSdkErrorCode.NETWORK_UNAVAILABLE, `${CHAIN_NAME}: Connection not initialized`);
    }
    return this.connection;
  }

  /**
   * Get wallet information
   */
  getWallet(): SolanaWalletInfo {
    if (!this.walletInfo) {
      throw new NetworkError(HibitIdSdkErrorCode.INVALID_CONFIGURATION, `${CHAIN_NAME}: Wallet not initialized`);
    }
    return this.walletInfo;
  }

  /**
   * Send and confirm a transaction
   */
  async sendAndConfirmTransaction(
    transaction: Transaction,
    signers?: Keypair[],
    options?: {
      commitment?: Commitment;
      preflightCommitment?: Commitment;
    }
  ): Promise<string> {
    const connection = this.getConnection();
    const wallet = this.getWallet();

    const allSigners = signers ? [wallet.keypair, ...signers] : [wallet.keypair];

    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, allSigners, {
        commitment: options?.commitment || DEFAULT_COMMITMENT,
        preflightCommitment: options?.preflightCommitment || DEFAULT_COMMITMENT
      });

      this.logger.debug('Transaction confirmed', {
        context: 'ConnectionManager.sendAndConfirmTransaction',
        data: { signature }
      });

      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TransactionError(
        HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED,
        `${CHAIN_NAME}: Transaction failed: ${errorMessage}`
      );
    }
  }

  /**
   * Simulate a transaction
   */
  async simulateTransaction(transaction: Transaction): Promise<void> {
    const connection = this.getConnection();
    const wallet = this.getWallet();

    try {
      const simulation = await connection.simulateTransaction(transaction, [wallet.keypair]);

      if (simulation.value.err) {
        const errorMessage = this.parseSimulationError(simulation.value.err);
        throw new TransactionError(
          HibitIdSdkErrorCode.TRANSACTION_SIGNING_FAILED,
          `${CHAIN_NAME}: Transaction simulation failed - ${errorMessage}`
        );
      }

      if (simulation.value.logs) {
        this.logger.debug('Transaction simulation successful', {
          context: 'ConnectionManager.simulateTransaction',
          data: {
            logs: simulation.value.logs
          }
        });
      }
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TransactionError(
        HibitIdSdkErrorCode.TRANSACTION_SIGNING_FAILED,
        `${CHAIN_NAME}: Transaction simulation failed: ${errorMessage}`
      );
    }
  }

  /**
   * Get transaction signature status
   */
  async getSignatureStatus(signature: string): Promise<SignatureStatus | null> {
    const connection = this.getConnection();

    try {
      const result = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true
      });

      return result.value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_NAME}: Failed to get signature status: ${errorMessage}`
      );
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(signature: string) {
    const connection = this.getConnection();

    try {
      const transaction = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });

      return transaction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_NAME}: Failed to get transaction details: ${errorMessage}`
      );
    }
  }

  /**
   * Subscribe to signature status updates via WebSocket
   * Falls back to polling if WebSocket is not available
   */
  async subscribeSignatureStatus(
    signature: string,
    callback: SignatureStatusCallback,
    commitment?: Commitment
  ): Promise<number | null> {
    if (!this.webSocketManager) {
      this.logger.debug(
        'WebSocket not available, falling back to polling',
        {
          context: 'ConnectionManager.subscribeSignatureStatus',
          data: { signature }
        }
      );
      return null;
    }

    try {
      return await this.webSocketManager.subscribeSignature(signature, callback, commitment || DEFAULT_COMMITMENT);
    } catch (error) {
      this.logger.warn(
        'Failed to subscribe via WebSocket, falling back to polling',
        {
          context: 'ConnectionManager.subscribeSignatureStatus',
          data: { signature, error: error instanceof Error ? error.message : String(error) }
        }
      );
      return null;
    }
  }

  /**
   * Unsubscribe from signature status updates
   */
  async unsubscribeSignatureStatus(subscriptionId: number): Promise<void> {
    if (!this.webSocketManager) {
      return;
    }

    await this.webSocketManager.unsubscribe(subscriptionId);
  }

  /**
   * Get multiple signature statuses in a single request
   * Useful for batch checking transaction statuses
   */
  async getSignatureStatuses(
    signatures: string[],
    config?: { searchTransactionHistory?: boolean }
  ): Promise<(SignatureStatus | null)[]> {
    const connection = this.getConnection();

    try {
      const result = await connection.getSignatureStatuses(
        signatures,
        config ? { searchTransactionHistory: config.searchTransactionHistory || false } : undefined
      );

      return result.value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_NAME}: Failed to get signature statuses: ${errorMessage}`
      );
    }
  }

  /**
   * Check if WebSocket is available and active
   */
  isWebSocketActive(): boolean {
    return this.webSocketManager?.isActive() || false;
  }

  /**
   * Get WebSocket subscription count
   */
  getWebSocketSubscriptionCount(): number {
    return this.webSocketManager?.getActiveSubscriptionCount() || 0;
  }

  /**
   * Check if the connection manager is initialized
   */
  isInitialized(): boolean {
    return this.connection !== null && this.walletInfo !== null;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Clean up WebSocket manager
    if (this.webSocketManager) {
      await this.webSocketManager.cleanup();
      this.webSocketManager = null;
    }

    this.connection = null;
    this.walletInfo = null;

    this.logger.debug('Connection manager cleaned up', {
      context: 'ConnectionManager.cleanup'
    });
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Get the RPC URL from chain configuration
   */
  private getRpcUrl(): string {
    // Use RPC URL from chainInfo
    if (this.chainInfo.rpc && this.chainInfo.rpc.primary) {
      return this.chainInfo.rpc.primary;
    }

    // Require RPC URL instead of using hardcoded fallback
    throw new NetworkError(
      HibitIdSdkErrorCode.INVALID_CONFIGURATION,
      `${CHAIN_NAME}: RPC URL must be provided in chainInfo.rpc.primary`
    );
  }

  /**
   * Parse simulation error for better error messages
   */
  private parseSimulationError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      if ('InstructionError' in error) {
        const [index, err] = error.InstructionError;
        return `Instruction ${index} failed: ${JSON.stringify(err)}`;
      }
      return JSON.stringify(error);
    }

    return 'Unknown error';
  }
}
