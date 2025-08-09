import BigNumber from 'bignumber.js';
import { ChainAssetType, ChainAccount, ChainId } from '@delandlabs/hibit-basic-types';
import {
  BaseChainWallet,
  ChainInfo,
  WalletConfig,
  SignMessageParams,
  BalanceQueryParams,
  TransferParams,
  TransactionConfirmationParams,
  TransactionConfirmationResult,
  TokenIdentifier,
  NetworkError,
  MnemonicError,
  MessageSigningError,
  GeneralWalletError,
  ArgumentError,
  HibitIdSdkErrorCode,
  ILogger,
  createReadyPromise,
  cleanupReferences,
  assertValidAddressForBalance,
  assertValidAddressForTransaction,
  assertValidTransferAmount,
  assertValidAddressForFeeEstimation,
  assertValidAmountForFeeEstimation,
  assertValidTokenAddressForBalance,
  assertValidTokenAddressForTransaction,
  assertValidTokenAddressForFeeEstimation,
  assertValidTokenAddressForDecimals,
  withErrorHandling,
  withLogging,
  cleanSensitiveData,
  getAssetTypeName
} from '@delandlabs/coin-base';
import { deriveEcdsaPrivateKey, base } from '@delandlabs/crypto-lib';
import { Keypair, NetworkId, RpcClient, Krc20RpcClient, Resolver } from '@kcoin/kaspa-web3.js';
import { BaseAssetHandler, KasNativeHandler, Krc20TokenHandler } from './asset-handlers';
import { CHAIN, CHAIN_NAME, DERIVING_PATH, KASPA_CONFIG } from './config';
import { UtxoChangedEvent, ChainChangeEvent } from './types';

// Register Kaspa validators

// Validator is now registered in the index.ts file using ChainValidation

/**
 * Kaspa blockchain wallet implementation supporting native KAS and KRC20 tokens.
 *
 * This refactored implementation uses the Strategy Pattern to handle different
 * asset types (Native KAS and KRC20 tokens). Each asset type has its own
 * handler that encapsulates the specific logic for that asset type.
 *
 * Key improvements:
 * - Separation of concerns: Each asset handler manages its own operations
 * - Shared services: RPC clients and key management are centralized
 * - Better testability: Each component can be tested independently
 * - Easier extensibility: New asset types can be added without modifying core logic
 *
 * Architecture features:
 * - UTXO management and subscription
 * - KRC20 token support with commit/reveal transaction pattern
 * - Comprehensive error handling with retry logic
 * - Asset-specific handlers for clean separation of concerns
 *
 * @example
 * ```typescript
 * const wallet = new KaspaChainWallet(chainInfo, mnemonic, { logger });
 * const account = await wallet.getAccount();
 * const balance = await wallet.balanceOf({ address: account.address, token: nativeAsset });
 * ```
 */
export class KaspaChainWallet extends BaseChainWallet {
  // Private fields
  private readonly networkId: NetworkId;
  private rpcClient: RpcClient | null = null;
  private krc20RpcClient: Krc20RpcClient | null = null;
  private keyPair?: Keypair;
  private addressSet: Set<string> = new Set(); // Track addresses for UTXO subscription
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly readyPromise: Promise<void>;
  private readonly assetHandlers: Map<ChainAssetType, BaseAssetHandler> = new Map();
  private destroyed: boolean = false;
  // Cache address validator to avoid repeated async lookups

  constructor(chainInfo: ChainInfo, mnemonic: string, options?: { logger?: ILogger }) {
    if (chainInfo.chainId.chain !== CHAIN) {
      throw new NetworkError(HibitIdSdkErrorCode.INVALID_CONFIGURATION, `${CHAIN_NAME}: Invalid chain type`);
    }

    // Validate mnemonic early to fail fast
    if (!mnemonic || mnemonic.trim() === '') {
      throw new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, `${CHAIN_NAME}: Empty mnemonic`);
    }

    const config: WalletConfig = {
      chainInfo,
      logger: options?.logger
    };
    super(config, mnemonic);

    this.networkId = chainInfo.isMainnet ? NetworkId.Mainnet : NetworkId.Testnet10;

    // Create address validator function using new ChainValidation API

    this.readyPromise = createReadyPromise(async () => {
      await this.initWallet(mnemonic);
      this.initializeAssetHandlers();
    });
  }

  // ==================== PUBLIC METHODS ====================

  // ==================== PROTECTED METHODS ====================

  /**
   * Implementation of getAccount - gets the wallet's account information
   */
  protected async getAccountImpl(): Promise<ChainAccount> {
    await this.readyPromise;

    if (!this.keyPair) {
      throw new NetworkError(HibitIdSdkErrorCode.NETWORK_UNAVAILABLE, `${CHAIN_NAME}: Wallet not initialized`);
    }

    const address = this.keyPair.toAddress(this.networkId.networkType).toString();
    const publicKey =
      this.keyPair.publicKey && typeof this.keyPair.publicKey !== 'string'
        ? Array.from(new Uint8Array(this.keyPair.publicKey))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
        : this.keyPair.publicKey || '';

    const chainId = new ChainId(this.chainInfo.chainId.chain, this.chainInfo.chainId.network);

    return new ChainAccount(chainId, address, publicKey);
  }

  /**
   * Implementation of message signing - uses wallet's keypair directly
   */
  protected async signMessageImpl(params: SignMessageParams): Promise<Uint8Array> {
    await this.readyPromise;

    if (!this.keyPair) {
      throw new MessageSigningError(HibitIdSdkErrorCode.MESSAGE_SIGNING_FAILED, `${CHAIN_NAME}: Wallet not initialized`);
    }

    const { message } = params;

    if (!message) {
      throw new MessageSigningError(HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT, `${CHAIN_NAME}: Missing sign data`);
    }

    const messageBytes = base.toUtf8(message);
    const signature = this.keyPair.signMessageWithAuxData(messageBytes, new Uint8Array(32).fill(0));
    return new Uint8Array(signature);
  }

  /**
   * Implementation of balance query - delegates to appropriate handler
   */
  protected async balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber> {
    await this.readyPromise;

    // Common validation for all assets: address format validation
    assertValidAddressForBalance(params.address, CHAIN, CHAIN_NAME);

    // Validate token address for KRC20 tokens
    if (params.token?.assetType === ChainAssetType.KRC20) {
      await assertValidTokenAddressForBalance(params.token.tokenAddress, CHAIN, CHAIN_NAME);
    }

    await this.refreshUtxoSubscription(params.address);

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.balanceOf(params);
  }

  /**
   * Implementation of transfer - delegates to appropriate handler
   */
  protected async transferImpl(params: TransferParams): Promise<string> {
    await this.readyPromise;

    // Common validation for all assets: address and amount validation
    assertValidAddressForTransaction(params.recipientAddress, CHAIN, CHAIN_NAME);
    assertValidTransferAmount(params.amount, CHAIN_NAME);

    // Validate token address for KRC20 tokens
    if (params.token?.assetType === ChainAssetType.KRC20) {
      await assertValidTokenAddressForTransaction(params.token.tokenAddress, CHAIN, CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.transfer(params);
  }

  /**
   * Implementation of fee estimation - delegates to appropriate handler
   */
  protected async estimateFeeImpl(params: TransferParams): Promise<BigNumber> {
    await this.readyPromise;

    // Common validation for all assets: address and amount validation
    assertValidAddressForFeeEstimation(params.recipientAddress, CHAIN, CHAIN_NAME);
    assertValidAmountForFeeEstimation(params.amount, CHAIN_NAME);

    // Validate token address for KRC20 tokens
    if (params.token?.assetType === ChainAssetType.KRC20) {
      await assertValidTokenAddressForFeeEstimation(params.token.tokenAddress, CHAIN, CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.estimateFee(params);
  }

  /**
   * Implementation of transaction confirmation waiting
   */
  protected async waitForConfirmationImpl(
    params: TransactionConfirmationParams
  ): Promise<TransactionConfirmationResult> {
    await this.readyPromise;

    const { txHash, requiredConfirmations = 1, timeoutMs = 60000, onConfirmationUpdate } = params;

    if (!this.rpcClient) {
      throw new NetworkError(HibitIdSdkErrorCode.NETWORK_UNAVAILABLE, `${CHAIN_NAME}: RPC client not initialized`);
    }

    // Check mempool status first
    await this.checkMempoolStatus(txHash, requiredConfirmations, onConfirmationUpdate);

    // Subscribe to chain changes and wait for confirmation
    return this.waitForChainConfirmation(txHash, requiredConfirmations, timeoutMs, onConfirmationUpdate);
  }

  /**
   * Check if transaction is still in mempool
   * @private
   */
  private async checkMempoolStatus(
    txHash: string,
    requiredConfirmations: number,
    onConfirmationUpdate?: (current: number, required: number) => void
  ): Promise<void> {
    if (!this.rpcClient) return;

    try {
      const mempoolEntry = await this.rpcClient.getMempoolEntry({
        transactionId: txHash,
        includeOrphanPool: true,
        filterTransactionPool: false
      });

      if (mempoolEntry.entry && onConfirmationUpdate) {
        // Transaction is still pending in mempool
        onConfirmationUpdate(0, requiredConfirmations);
      }
    } catch {
      // Transaction not in mempool, might be confirmed or failed
      // This is not an error, just means transaction is not pending
    }
  }

  /**
   * Wait for transaction confirmation via chain change events
   * @private
   */
  private async waitForChainConfirmation(
    txHash: string,
    requiredConfirmations: number,
    timeoutMs: number,
    onConfirmationUpdate?: (current: number, required: number) => void
  ): Promise<TransactionConfirmationResult> {
    if (!this.rpcClient) {
      throw new NetworkError(HibitIdSdkErrorCode.NETWORK_UNAVAILABLE, `${CHAIN_NAME}: RPC client not initialized`);
    }

    const startTime = Date.now();
    let blockHash: string | undefined;
    let blockNumber: number | undefined;

    // Subscribe to virtual chain changes for real-time confirmation tracking
    await this.rpcClient.subscribeVirtualChainChanged(true);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.cleanupChainSubscription();
        resolve(this.createTimeoutResult(0, requiredConfirmations, blockHash, blockNumber));
      }, timeoutMs);

      const chainChangeHandler = (event: ChainChangeEvent) => {
        const result = this.processChainChangeEvent(event, txHash, 0, requiredConfirmations, onConfirmationUpdate);

        if (result) {
          blockHash = result.blockHash;

          if (result.isConfirmed) {
            clearTimeout(timeout);
            this.cleanupChainSubscription();
            resolve(result);
            return;
          }
        }

        // Check for timeout
        if (Date.now() - startTime >= timeoutMs) {
          clearTimeout(timeout);
          this.cleanupChainSubscription();
          resolve(this.createFinalResult(0, requiredConfirmations, blockHash, blockNumber));
        }
      };

      this.rpcClient?.addEventListener('VirtualChainChanged', chainChangeHandler);

      // Also do an immediate check by searching recent blocks
      this.performInitialBlockCheck(txHash, requiredConfirmations, onConfirmationUpdate)
        .then((result) => {
          if (result?.isConfirmed) {
            clearTimeout(timeout);
            this.cleanupChainSubscription();
            resolve(result);
          } else if (result) {
            blockHash = result.blockHash;
          }
        })
        .catch(() => {
          // Ignore errors in recent block check, rely on subscription
          // This is logged at debug level by the decorator on checkTransactionInRecentBlocks
        });
    });
  }

  /**
   * Process chain change event for transaction confirmation
   * @private
   */
  private processChainChangeEvent(
    event: ChainChangeEvent,
    txHash: string,
    _currentConfirmations: number,
    requiredConfirmations: number,
    onConfirmationUpdate?: (current: number, required: number) => void
  ): TransactionConfirmationResult | null {
    if (!event.acceptedTransactionIds) {
      return null;
    }

    for (const acceptedBlock of event.acceptedTransactionIds) {
      if (acceptedBlock.acceptedTransactionIds?.includes(txHash)) {
        const confirmations = 1; // Initially confirmed
        const blockHash = acceptedBlock.acceptingBlockHash;

        if (onConfirmationUpdate) {
          onConfirmationUpdate(confirmations, requiredConfirmations);
        }

        // For Kaspa, once a transaction is accepted into the virtual chain,
        // it's considered confirmed. Additional confirmations come from
        // DAG depth which is more complex to calculate in real-time.
        if (confirmations >= requiredConfirmations) {
          return {
            isConfirmed: true,
            confirmations,
            requiredConfirmations,
            status: 'confirmed',
            blockHash,
            blockNumber: undefined
          };
        }

        return {
          isConfirmed: false,
          confirmations,
          requiredConfirmations,
          status: 'pending',
          blockHash,
          blockNumber: undefined
        };
      }
    }

    return null;
  }

  /**
   * Perform initial check in recent blocks
   * @private
   */
  private async performInitialBlockCheck(
    txHash: string,
    requiredConfirmations: number,
    onConfirmationUpdate?: (current: number, required: number) => void
  ): Promise<TransactionConfirmationResult | null> {
    try {
      const result = await this.checkTransactionInRecentBlocks(txHash);
      if (result.found) {
        const confirmations = 1;

        if (onConfirmationUpdate) {
          onConfirmationUpdate(confirmations, requiredConfirmations);
        }

        if (confirmations >= requiredConfirmations) {
          return {
            isConfirmed: true,
            confirmations,
            requiredConfirmations,
            status: 'confirmed',
            blockHash: result.blockHash,
            blockNumber: undefined
          };
        }

        return {
          isConfirmed: false,
          confirmations,
          requiredConfirmations,
          status: 'pending',
          blockHash: result.blockHash,
          blockNumber: undefined
        };
      }
    } catch {
      // Errors are logged by the decorator, just return null
    }

    return null;
  }

  /**
   * Clean up chain change subscription
   * @private
   */
  private cleanupChainSubscription(): void {
    // Note: Event listener cleanup is handled by the Promise resolver
    // This method is a placeholder for future cleanup logic
  }

  /**
   * Create timeout result
   * @private
   */
  private createTimeoutResult(
    currentConfirmations: number,
    requiredConfirmations: number,
    blockHash?: string,
    blockNumber?: number
  ): TransactionConfirmationResult {
    return {
      isConfirmed: false,
      confirmations: currentConfirmations,
      requiredConfirmations,
      status: 'timeout',
      blockHash,
      blockNumber
    };
  }

  /**
   * Create final result based on current state
   * @private
   */
  private createFinalResult(
    currentConfirmations: number,
    requiredConfirmations: number,
    blockHash?: string,
    blockNumber?: number
  ): TransactionConfirmationResult {
    return {
      isConfirmed: currentConfirmations >= requiredConfirmations,
      confirmations: currentConfirmations,
      requiredConfirmations,
      status: currentConfirmations >= requiredConfirmations ? 'confirmed' : 'timeout',
      blockHash,
      blockNumber
    };
  }

  /**
   * Implementation of getAssetDecimals
   * Returns the number of decimals for the specified asset
   */
  protected async getAssetDecimalsImpl(token: TokenIdentifier): Promise<number> {
    await this.readyPromise;

    if (token.assetType === ChainAssetType.Native) {
      // KAS always has 8 decimals (1 KAS = 10^8 sompi)
      return 8;
    }

    // For KRC20 tokens, validate token address first
    if (token.assetType === ChainAssetType.KRC20) {
      await assertValidTokenAddressForDecimals(token.tokenAddress, CHAIN, CHAIN_NAME);

      const handler = this.getAssetHandler(token.assetType);
      if ('getDecimals' in handler && typeof handler.getDecimals === 'function') {
        return await handler.getDecimals(token.tokenAddress);
      }
    }

    throw new Error(`Cannot get decimals for asset type: ${token.assetType}`);
  }

  /**
   * Clean up resources when wallet is disposed
   */
  protected destroyImpl(): void {
    // Mark as destroyed to prevent race conditions
    this.destroyed = true;

    // Clean up ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Unsubscribe from UTXO changes
    const addresses = Array.from(this.addressSet);
    if (this.rpcClient && addresses.length > 0) {
      this.rpcClient.unsubscribeUtxosChanged(addresses);
    }

    // Clean up address set
    this.addressSet.clear();

    // Clean up asset handlers
    this.assetHandlers.clear();

    // Clean up references
    cleanupReferences(this, ['rpcClient', 'krc20RpcClient', 'keyPair']);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Initialize the wallet from mnemonic
   * @private
   */
  @withErrorHandling({ errorType: 'general' }, 'Failed to initialize wallet')
  @withLogging('Initialize wallet')
  @cleanSensitiveData()
  private async initWallet(mnemonic: string): Promise<void> {
    if (!mnemonic || mnemonic.trim() === '') {
      throw new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, `${CHAIN_NAME}: Empty mnemonic`);
    }

    // Generate keypair from mnemonic
    const privateKeyHex = await deriveEcdsaPrivateKey(mnemonic, DERIVING_PATH);
    this.keyPair = Keypair.fromPrivateKeyHex(privateKeyHex);

    // Clear sensitive data from memory immediately after use
    // Overwrite the hex string with zeros
    if (typeof privateKeyHex === 'string') {
      const arr = privateKeyHex.split('');
      for (let i = 0; i < arr.length; i++) {
        arr[i] = '0';
      }
    }

    // Initialize RPC clients
    this.rpcClient = new RpcClient({
      networkId: this.networkId,
      resolver: Resolver.createWithEndpoints([this.getEndpoint(this.chainInfo)])
    });
    this.rpcClient.addEventListener('UtxosChanged', this.handleUtxoChange.bind(this));
    this.krc20RpcClient = new Krc20RpcClient({ networkId: this.networkId });

    // Clear mnemonic parameter to prevent memory retention
    // Note: This only clears the local reference, the original string may still exist
    // in memory until garbage collection, but it reduces the attack surface
    (mnemonic as any) = null;
  }

  /**
   * Initialize asset handlers after wallet is ready
   * @private
   */
  @withLogging('Initialize asset handlers')
  private initializeAssetHandlers(): void {
    // If wallet was destroyed during initialization, silently return
    if (this.destroyed) {
      return;
    }

    if (!this.rpcClient || !this.keyPair) {
      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_NAME}: Wallet not initialized - missing RPC client or keypair`
      );
    }

    // Create and register Native handler
    const nativeHandler = new KasNativeHandler(
      this.rpcClient,
      this.krc20RpcClient,
      this.keyPair,
      this.networkId,
      this.logger
    );
    this.assetHandlers.set(ChainAssetType.Native, nativeHandler);

    // Create and register KRC20 handler
    const krc20Handler = new Krc20TokenHandler(
      this.rpcClient,
      this.krc20RpcClient,
      this.keyPair,
      this.networkId,
      this.logger
    );
    this.assetHandlers.set(ChainAssetType.KRC20, krc20Handler);
  }

  /**
   * Get the appropriate asset handler for the given asset type
   * @private
   */
  private getAssetHandler(assetType: ChainAssetType | undefined): BaseAssetHandler {
    if (assetType === undefined) {
      throw new ArgumentError(
        HibitIdSdkErrorCode.INVALID_ARGUMENT,
        `${CHAIN_NAME}: Missing asset type in token parameter`,
        { argumentName: 'assetType', expectedType: 'ChainAssetType' }
      );
    }

    const handler = this.assetHandlers.get(assetType);

    if (!handler) {
      throw new GeneralWalletError(
        HibitIdSdkErrorCode.UNSUPPORTED_ASSET_TYPE,
        `${CHAIN_NAME}: Asset type ${getAssetTypeName(assetType)} is not supported`
      );
    }

    return handler;
  }

  /**
   * Refresh UTXO subscription for balance monitoring
   * @private
   * @param address - Address to monitor
   */
  @withLogging('Refresh UTXO subscription', (args: [string]) => ({ address: args[0] }), () => ({ subscribed: true }))
  @withErrorHandling({ errorType: 'general' }, 'Failed to refresh UTXO subscription')
  private async refreshUtxoSubscription(address: string): Promise<void> {
    if (!this.rpcClient) {
      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_NAME}: RPC client not initialized for UTXO subscription`
      );
    }

    if (!this.addressSet.has(address)) {
      const existingAddresses = Array.from(this.addressSet);
      if (existingAddresses.length > 0) {
        await this.rpcClient.unsubscribeUtxosChanged(existingAddresses);
      }

      // Add address to tracking set
      this.addressSet.add(address);

      const newAddresses = Array.from(this.addressSet);
      await this.rpcClient.subscribeUtxosChanged(newAddresses);

      // Start ping interval if not already running
      if (!this.pingInterval) {
        this.pingInterval = setInterval(() => {
          if (this.rpcClient) {
            this.rpcClient.ping();
          }
        }, KASPA_CONFIG.PING_INTERVAL_MS);
      }
    }
  }

  /**
   * Handle UTXO change events from the Kaspa network
   * @private
   * @param data - UTXO change event data
   */
  @withLogging('Handle UTXO change')
  private handleUtxoChange(data: unknown): void {
    if (this.isValidUtxoChangeEvent(data)) {
      const utxoEvent = data as UtxoChangedEvent;
      const addresses = Array.from(this.addressSet);

      addresses.forEach((address) => {
        const hasChange =
          utxoEvent.UtxosChanged.added?.some((item) => item.address === address) ||
          utxoEvent.UtxosChanged.removed?.some((item) => item.address === address);

        if (hasChange) {
          // Change detected for address - logging handled by decorator
        }
      });
    }
  }

  /**
   * Type guard for UTXO change events
   * @private
   * @param data - Data to check
   * @returns True if data is a valid UTXO change event
   */
  private isValidUtxoChangeEvent(data: unknown): data is UtxoChangedEvent {
    return (
      data !== null &&
      data !== undefined &&
      typeof data === 'object' &&
      'UtxosChanged' in data &&
      data.UtxosChanged !== null &&
      data.UtxosChanged !== undefined &&
      typeof data.UtxosChanged === 'object' &&
      ('added' in data.UtxosChanged || 'removed' in data.UtxosChanged)
    );
  }

  /**
   * Check if transaction exists in recent blocks
   * @private
   * @param txHash - Transaction hash to search for
   * @returns Promise with search result
   */
  @withLogging(
    'Check transaction in recent blocks',
    (args: [string]) => ({ txHash: args[0] }),
    (result: { found: boolean; blockHash?: string }) => ({
      found: result.found,
      blockHash: result.blockHash
    })
  )
  private async checkTransactionInRecentBlocks(txHash: string): Promise<{ found: boolean; blockHash?: string }> {
    if (!this.rpcClient) {
      return { found: false };
    }

    // Get current DAG info to understand recent blocks
    const dagInfo = await this.rpcClient.getBlockDagInfo();
    const currentTips = dagInfo.tipHashes || [];

    // Check the last few blocks from tips
    for (const tipHash of currentTips.slice(0, 3)) {
      // Check up to 3 recent tips
      const block = await this.rpcClient.getBlock({
        hash: tipHash,
        includeTransactions: true
      });

      if (block.block?.transactions) {
        for (const tx of block.block.transactions) {
          if (tx.verboseData?.transactionId === txHash) {
            return {
              found: true,
              blockHash: block.block.verboseData?.hash
            };
          }
        }
      }
    }

    return { found: false };
  }

  /**
   * Get RPC endpoint from chain configuration
   * @private
   * @param chainInfo - Chain information
   * @returns RPC endpoint URL
   */
  @withLogging('Get RPC endpoint', undefined, (result: string) => ({ endpoint: result }))
  private getEndpoint(chainInfo: ChainInfo): string {
    // Use RPC URL from chainInfo
    if (chainInfo.rpc && chainInfo.rpc.primary) {
      return chainInfo.rpc.primary;
    }

    // This should never happen - chainInfo must provide RPC endpoint
    throw new NetworkError(HibitIdSdkErrorCode.INVALID_CONFIGURATION, `${CHAIN_NAME}: No RPC URL provided in chainInfo`);
  }
}
