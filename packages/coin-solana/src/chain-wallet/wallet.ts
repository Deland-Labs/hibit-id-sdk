import BigNumber from 'bignumber.js';
import { Keypair, Commitment } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import { ChainAccount, ChainAssetType, ChainId } from '@delandlabs/hibit-basic-types';
import {
  BaseChainWallet,
  WalletConfig,
  ChainInfo,
  MnemonicError,
  NetworkError,
  GeneralWalletError,
  ArgumentError,
  HibitIdSdkErrorCode,
  SignMessageParams,
  BalanceQueryParams,
  TransferParams,
  TransactionConfirmationParams,
  TransactionConfirmationResult,
  TokenIdentifier,
  ILogger,
  createReadyPromise,
  cleanupReferences,
  assertValidAddressForBalance,
  assertValidAddressForTransaction,
  assertValidTransferAmount,
  assertValidAmountForFeeEstimation,
  assertValidTokenAddressForBalance,
  assertValidTokenAddressForTransaction,
  assertValidTokenAddressForFeeEstimation,
  assertValidTokenAddressForDecimals,
  MessageSigningError,
  withLogging,
  withErrorHandling,
  cleanSensitiveData,
  getAssetTypeName
} from '@delandlabs/coin-base';
import { deriveEd25519PrivateKey, EncodingFormat, base } from '@delandlabs/crypto-lib';
import {
  CHAIN,
  DERIVING_PATH,
  CHAIN_CONFIG,
  ERROR_MESSAGES,
  DEFAULT_CONFIRMATION_TIMEOUT_MS,
  DEFAULT_CONFIRMATION_POLL_INTERVAL_MS,
  MAX_CONFIRMATION_POLL_INTERVAL_MS,
  ConfirmationStrategyConfig,
  DEFAULT_CONFIRMATION_STRATEGY
} from './config';
import { BaseAssetHandler, SolNativeHandler, SplTokenHandler } from './asset-handlers';
import { ConnectionManager, type SolanaWalletInfo } from './shared';

/**
 * Solana blockchain wallet implementation supporting SOL and SPL tokens.
 *
 * This refactored implementation uses the Strategy Pattern to handle different
 * asset types (Native SOL and SPL tokens). Each asset type has its own
 * handler that encapsulates the specific logic for that asset type.
 *
 * Key improvements:
 * - Separation of concerns: Each asset handler manages its own operations
 * - Shared services: Connection management is centralized
 * - Better testability: Each component can be tested independently
 * - Solana-specific features: Priority fees, transaction simulation, memo support
 * - Easier extensibility: New asset types can be added without modifying core logic
 */
export class SolanaChainWallet extends BaseChainWallet {
  // Private fields
  private walletInfo: SolanaWalletInfo | null = null;
  private readonly readyPromise: Promise<void>;
  private readonly confirmationStrategy: Required<ConfirmationStrategyConfig>;

  // Shared services
  private readonly connectionManager: ConnectionManager;

  // Asset handlers
  private readonly assetHandlers: Map<ChainAssetType, BaseAssetHandler>;

  constructor(
    chainInfo: ChainInfo,
    mnemonic: string,
    options?: {
      logger?: ILogger;
      confirmationStrategy?: ConfirmationStrategyConfig;
    }
  ) {
    if (chainInfo.chainId.chain !== CHAIN) {
      throw new NetworkError(HibitIdSdkErrorCode.INVALID_CONFIGURATION, ERROR_MESSAGES.INVALID_CHAIN);
    }
    const config: WalletConfig = {
      chainInfo,
      logger: options?.logger
    };
    super(config, mnemonic);

    // Apply confirmation strategy configuration
    this.confirmationStrategy = {
      ...DEFAULT_CONFIRMATION_STRATEGY,
      ...options?.confirmationStrategy,
      customCommitmentMapping: {
        ...DEFAULT_CONFIRMATION_STRATEGY.customCommitmentMapping,
        ...options?.confirmationStrategy?.customCommitmentMapping
      },
      webSocketConfig: {
        ...DEFAULT_CONFIRMATION_STRATEGY.webSocketConfig,
        ...options?.confirmationStrategy?.webSocketConfig
      }
    };

    // Initialize shared services with WebSocket support if enabled
    this.connectionManager = new ConnectionManager(
      chainInfo,
      this.logger,
      this.confirmationStrategy.useWebSocket
        ? {
            enableAutoReconnect: true,
            ...this.confirmationStrategy.webSocketConfig
          }
        : undefined
    );

    // Initialize asset handlers map
    this.assetHandlers = new Map();

    // Create ready promise
    this.readyPromise = createReadyPromise(async () => {
      await this.initializeWallet(mnemonic);
      this.initializeAssetHandlers();
    });
  }

  // ============================================================
  // Public Methods
  // ============================================================

  // ============================================================
  // Protected Methods (BaseChainWallet implementations)
  // ============================================================

  /**
   * Implementation of getAccount
   */
  protected async getAccountImpl(): Promise<ChainAccount> {
    await this.readyPromise;

    if (!this.walletInfo) {
      throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
    }

    const chainId = new ChainId(this.chainInfo.chainId.chain, this.chainInfo.chainId.network);
    const publicKeyHex = base.toHex(this.walletInfo.keypair.publicKey.toBytes());

    return new ChainAccount(chainId, this.walletInfo.address, publicKeyHex);
  }

  /**
   * Implementation of balance query using strategy pattern
   */
  protected async balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber> {
    await this.readyPromise;

    // Validate address using coin-base standard validation
    assertValidAddressForBalance(params.address, CHAIN, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for SPL tokens
    if (params.token?.assetType === ChainAssetType.SPL) {
      await assertValidTokenAddressForBalance(params.token.tokenAddress, CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.balanceOf(params);
  }

  /**
   * Implementation of transfer using strategy pattern
   */
  protected async transferImpl(params: TransferParams): Promise<string> {
    await this.readyPromise;

    // Validate recipient address and transfer amount using coin-base standard validation
    assertValidAddressForTransaction(params.recipientAddress, CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    assertValidTransferAmount(params.amount, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for SPL tokens
    if (params.token?.assetType === ChainAssetType.SPL) {
      await assertValidTokenAddressForTransaction(params.token.tokenAddress, CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.transfer(params);
  }

  /**
   * Implementation of fee estimation using strategy pattern
   */
  protected async estimateFeeImpl(params: TransferParams): Promise<BigNumber> {
    await this.readyPromise;

    // Validate recipient address and transfer amount using coin-base standard validation
    assertValidAddressForTransaction(params.recipientAddress, CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    assertValidAmountForFeeEstimation(params.amount, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for SPL tokens
    if (params.token?.assetType === ChainAssetType.SPL) {
      await assertValidTokenAddressForFeeEstimation(params.token.tokenAddress, CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.estimateFee(params);
  }

  /**
   * Implementation of message signing
   * Note: Only supported for native SOL in Solana
   */
  protected async signMessageImpl(params: SignMessageParams): Promise<Uint8Array> {
    await this.readyPromise;

    const { message, deterministic = true } = params;

    if (!message) {
      throw new MessageSigningError(
        HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT,
        `${CHAIN_CONFIG.CHAIN_NAME}: Missing sign data`
      );
    }

    if (!this.walletInfo) {
      throw new MessageSigningError(
        HibitIdSdkErrorCode.MESSAGE_SIGNING_FAILED,
        `${CHAIN_CONFIG.CHAIN_NAME}: Wallet not initialized`
      );
    }

    // Solana always uses deterministic signing with nacl
    // The deterministic parameter is included for interface compatibility
    void deterministic; // Suppress unused variable warning

    const messageBytes = base.toUtf8(message);
    return nacl.sign.detached(messageBytes, this.walletInfo.keypair.secretKey);
  }

  /**
   * Implementation of transaction confirmation waiting
   * Uses WebSocket subscription for real-time updates with polling fallback
   */
  protected async waitForConfirmationImpl(
    params: TransactionConfirmationParams
  ): Promise<TransactionConfirmationResult> {
    const { txHash, timeoutMs = DEFAULT_CONFIRMATION_TIMEOUT_MS, onConfirmationUpdate } = params;
    const requiredConfirmations = params.requiredConfirmations ?? 1;

    let currentConfirmations = 0;
    let subscriptionId: number | null = null;

    // Use WebSocket if enabled in strategy
    if (!this.confirmationStrategy.useWebSocket) {
      return this.pollForConfirmation(params);
    }

    // Determine commitment level based on required confirmations
    const commitment = this.getCommitmentForConfirmations(requiredConfirmations);

    return new Promise<TransactionConfirmationResult>(async (resolve) => {
      // Helper function to complete with result
      const completeWithResult = async (result: TransactionConfirmationResult) => {
        // Cleanup subscription if exists
        if (subscriptionId !== null) {
          await this.connectionManager.unsubscribeSignatureStatus(subscriptionId);
        }
        resolve(result);
      };

      // Set up timeout handler
      const timeoutId = setTimeout(async () => {
        await completeWithResult({
          isConfirmed: false,
          confirmations: currentConfirmations,
          requiredConfirmations,
          status: 'timeout',
          blockHash: undefined,
          blockNumber: undefined
        });
      }, timeoutMs);

      try {
        // Try to subscribe via WebSocket for real-time updates
        subscriptionId = await this.connectionManager.subscribeSignatureStatus(
          txHash,
          async (status, error) => {
            // Clear timeout as we got a response
            clearTimeout(timeoutId);

            if (error) {
              this.logger.warn('WebSocket error, falling back to polling', {
                context: 'waitForConfirmationImpl',
                data: {
                  txHash,
                  error: error.message
                }
              });

              // Fall back to polling if enabled
              if (this.confirmationStrategy.fallbackToPolling) {
                const pollingResult = await this.pollForConfirmation(params);
                await completeWithResult(pollingResult);
              } else {
                // No fallback - return error
                await completeWithResult({
                  isConfirmed: false,
                  confirmations: currentConfirmations,
                  requiredConfirmations,
                  status: 'failed',
                  blockHash: undefined,
                  blockNumber: undefined
                });
              }
              return;
            }

            if (!status) {
              // Transaction not found - wait a bit and retry with polling
              await this.sleep(DEFAULT_CONFIRMATION_POLL_INTERVAL_MS);
              const pollingResult = await this.pollForConfirmation(params);
              await completeWithResult(pollingResult);
              return;
            }

            // Check for transaction failure
            if (status.err) {
              await completeWithResult({
                isConfirmed: false,
                confirmations: 0,
                requiredConfirmations,
                status: 'failed',
                blockHash: undefined,
                blockNumber: undefined
              });
              return;
            }

            // Calculate current confirmations
            const actualConfirmations = this.calculateConfirmationsFromStatus(status);
            currentConfirmations = actualConfirmations;

            // Report progress
            if (onConfirmationUpdate) {
              onConfirmationUpdate(currentConfirmations, requiredConfirmations);
            }

            // Check if we've reached required confirmation level
            if (actualConfirmations >= requiredConfirmations) {
              // Get additional transaction details
              const txDetails = await this.connectionManager.getTransactionDetails(txHash);

              await completeWithResult({
                isConfirmed: true,
                confirmations: actualConfirmations,
                requiredConfirmations,
                status: 'confirmed',
                blockHash: txDetails?.transaction?.message
                  ? (txDetails.transaction.message as any).recentBlockhash
                  : undefined,
                blockNumber: txDetails?.slot,
                transactionFee: txDetails?.meta?.fee
                  ? new BigNumber(txDetails.meta.fee).dividedBy(1000000000)
                  : undefined
              });
            }
          },
          commitment
        );

        // If WebSocket subscription failed, fall back to polling
        if (subscriptionId === null) {
          clearTimeout(timeoutId);
          const pollingResult = await this.pollForConfirmation(params);
          await completeWithResult(pollingResult);
        }
      } catch (error) {
        clearTimeout(timeoutId);

        this.logger.warn('Failed to use WebSocket, falling back to polling', {
          context: 'waitForConfirmationImpl',
          data: {
            txHash,
            error: error instanceof Error ? error.message : String(error)
          }
        });

        // Fall back to polling
        const pollingResult = await this.pollForConfirmation(params);
        await completeWithResult(pollingResult);
      }
    });
  }

  /**
   * Clean up resources when wallet is no longer needed
   */
  protected async destroyImpl(): Promise<void> {
    // Clean up shared services
    await this.connectionManager.cleanup();

    // Clean up asset handlers
    this.assetHandlers.clear();

    // Clean up wallet info reference
    this.walletInfo = null;

    // Clean up any remaining references
    cleanupReferences(this, ['readyPromise']);
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Initialize the wallet from mnemonic
   * @private
   */
  @withErrorHandling({ errorType: 'general' }, 'Failed to initialize wallet')
  @withLogging('Initialize wallet')
  @cleanSensitiveData()
  private async initializeWallet(mnemonic: string): Promise<void> {
    if (!mnemonic || mnemonic.trim() === '') {
      throw new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, `${CHAIN_CONFIG.CHAIN_NAME}: Empty mnemonic`);
    }

    // Derive Ed25519 private key for Solana
    const privateKeyHex = await deriveEd25519PrivateKey(
      mnemonic,
      DERIVING_PATH,
      false, // includePublicKey
      EncodingFormat.HEX // encodingFormat
    );
    // Convert hex to Uint8Array
    const privateKeyBytes = base.fromHex(privateKeyHex);

    // Solana uses 64-byte keys (32-byte private key + 32-byte public key)
    // Create the full keypair from the 32-byte private key
    const secretKey = new Uint8Array(64);
    secretKey.set(privateKeyBytes.slice(0, 32));
    const publicKey = nacl.sign.keyPair.fromSeed(privateKeyBytes.slice(0, 32)).publicKey;
    secretKey.set(publicKey, 32);

    const keypair = Keypair.fromSecretKey(secretKey);
    const address = keypair.publicKey.toBase58();

    // Store wallet information
    this.walletInfo = {
      keypair,
      address
    };

    // Initialize connection manager with wallet info
    this.connectionManager.initialize(this.walletInfo);
  }

  /**
   * Initialize asset handlers after wallet is ready
   * @private
   */
  @withLogging('Initialize asset handlers')
  private initializeAssetHandlers(): void {
    // Create and register Native SOL handler
    const nativeHandler = new SolNativeHandler(this.connectionManager, this.logger);
    this.assetHandlers.set(ChainAssetType.Native, nativeHandler);

    // Create and register SPL token handler
    const splTokenHandler = new SplTokenHandler(this.connectionManager, this.logger);
    this.assetHandlers.set(ChainAssetType.SPL, splTokenHandler);
  }

  /**
   * Get the appropriate asset handler for the given asset type
   * @private
   */
  private getAssetHandler(assetType: ChainAssetType | undefined): BaseAssetHandler {
    if (assetType === undefined) {
      throw new ArgumentError(
        HibitIdSdkErrorCode.INVALID_ARGUMENT,
        `${CHAIN_CONFIG.CHAIN_NAME}: Missing asset type in token parameter`,
        { argumentName: 'assetType', expectedType: 'ChainAssetType' }
      );
    }
    const handler = this.assetHandlers.get(assetType);
    if (!handler) {
      throw new GeneralWalletError(
        HibitIdSdkErrorCode.UNSUPPORTED_ASSET_TYPE,
        `${CHAIN_CONFIG.CHAIN_NAME}: Asset type ${getAssetTypeName(assetType)} is not supported`
      );
    }
    return handler;
  }

  /**
   * Implementation of getAssetDecimals
   * Returns the number of decimals for the specified asset
   */
  protected async getAssetDecimalsImpl(token: TokenIdentifier): Promise<number> {
    await this.readyPromise;

    if (token.assetType === ChainAssetType.Native) {
      // SOL always has 9 decimals
      return 9;
    }

    // For SPL tokens, validate token address first
    if (token.assetType === ChainAssetType.SPL) {
      await assertValidTokenAddressForDecimals(token.tokenAddress, CHAIN, CHAIN_CONFIG.CHAIN_NAME);

      const handler = this.getAssetHandler(token.assetType);
      if ('getDecimals' in handler && typeof handler.getDecimals === 'function') {
        return await handler.getDecimals(token.tokenAddress);
      }
    }

    throw new Error(`Cannot get decimals for asset type: ${token.assetType}`);
  }

  /**
   * Calculate confirmations from signature status based on commitment level
   * @private
   */
  private calculateConfirmationsFromStatus(status: any): number {
    // Use custom mapping if provided, otherwise use defaults
    const mapping = this.confirmationStrategy.customCommitmentMapping;

    if (status.confirmationStatus === 'finalized') {
      return mapping.finalized || 10;
    } else if (status.confirmationStatus === 'confirmed') {
      return mapping.confirmed || 3;
    } else if (status.confirmationStatus === 'processed') {
      return mapping.processed || 1;
    }

    return 0; // Not yet processed
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get commitment level based on required confirmations
   * @private
   */
  private getCommitmentForConfirmations(requiredConfirmations: number): Commitment {
    if (requiredConfirmations >= 10) {
      return 'finalized';
    } else if (requiredConfirmations >= 3) {
      return 'confirmed';
    } else {
      return 'processed';
    }
  }

  /**
   * Poll for transaction confirmation (fallback when WebSocket not available)
   * @private
   */
  private async pollForConfirmation(params: TransactionConfirmationParams): Promise<TransactionConfirmationResult> {
    const { txHash, timeoutMs = DEFAULT_CONFIRMATION_TIMEOUT_MS, onConfirmationUpdate } = params;
    const requiredConfirmations = params.requiredConfirmations ?? 1;

    const startTime = Date.now();
    let pollInterval = DEFAULT_CONFIRMATION_POLL_INTERVAL_MS;
    let currentConfirmations = 0;
    let consecutiveNotFound = 0;
    const maxConsecutiveNotFound = 5;

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Get signature status
        const status = await this.connectionManager.getSignatureStatus(txHash);

        if (status === null) {
          // Transaction not found
          consecutiveNotFound++;

          if (consecutiveNotFound >= maxConsecutiveNotFound) {
            // Too many consecutive not found - likely invalid transaction
            return {
              isConfirmed: false,
              confirmations: 0,
              requiredConfirmations,
              status: 'failed',
              blockHash: undefined,
              blockNumber: undefined
            };
          }

          await this.sleep(pollInterval);
          pollInterval = Math.min(pollInterval * 1.2, MAX_CONFIRMATION_POLL_INTERVAL_MS);
          continue;
        }

        // Reset not found counter
        consecutiveNotFound = 0;

        // Check for transaction failure
        if (status.err) {
          return {
            isConfirmed: false,
            confirmations: 0,
            requiredConfirmations,
            status: 'failed',
            blockHash: undefined,
            blockNumber: undefined
          };
        }

        // Calculate current confirmations
        const actualConfirmations = this.calculateConfirmationsFromStatus(status);
        currentConfirmations = actualConfirmations;

        // Report progress
        if (onConfirmationUpdate) {
          onConfirmationUpdate(currentConfirmations, requiredConfirmations);
        }

        // Check if we've reached required confirmation level
        if (actualConfirmations >= requiredConfirmations) {
          // Get additional transaction details
          const txDetails = await this.connectionManager.getTransactionDetails(txHash);

          return {
            isConfirmed: true,
            confirmations: actualConfirmations,
            requiredConfirmations,
            status: 'confirmed',
            blockHash: txDetails?.transaction?.message
              ? (txDetails.transaction.message as any).recentBlockhash
              : undefined,
            blockNumber: txDetails?.slot,
            transactionFee: txDetails?.meta?.fee ? new BigNumber(txDetails.meta.fee).dividedBy(1000000000) : undefined
          };
        }

        // Intelligent polling interval adjustment if enabled
        if (this.confirmationStrategy.intelligentPolling) {
          if (actualConfirmations === 0) {
            // No confirmations yet - poll more frequently
            pollInterval = DEFAULT_CONFIRMATION_POLL_INTERVAL_MS;
          } else if (actualConfirmations < requiredConfirmations / 2) {
            // Less than halfway - moderate polling
            pollInterval = Math.min(pollInterval * 1.1, 2000);
          } else {
            // More than halfway - can slow down a bit
            pollInterval = Math.min(pollInterval * 1.2, MAX_CONFIRMATION_POLL_INTERVAL_MS);
          }
        } else {
          // Fixed interval with slight backoff
          pollInterval = Math.min(pollInterval * 1.2, MAX_CONFIRMATION_POLL_INTERVAL_MS);
        }

        await this.sleep(pollInterval);
      } catch (error) {
        this.logger.error(
          'Error during confirmation polling',
          {
            error: error instanceof Error ? error : new Error(String(error)),
            context: 'pollForConfirmation',
            data: { txHash }
          }
        );

        // Continue polling on error
        await this.sleep(pollInterval);
        pollInterval = Math.min(pollInterval * 1.5, MAX_CONFIRMATION_POLL_INTERVAL_MS);
      }
    }

    // Timeout reached
    return {
      isConfirmed: false,
      confirmations: currentConfirmations,
      requiredConfirmations,
      status: 'timeout',
      blockHash: undefined,
      blockNumber: undefined
    };
  }
}
