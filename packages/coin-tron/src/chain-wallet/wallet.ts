import BigNumber from 'bignumber.js';
import * as secp256k1 from '@noble/secp256k1';
import {
  BaseChainWallet,
  ILogger,
  WalletConfig,
  ChainInfo,
  BalanceQueryParams,
  TransferParams,
  SignMessageParams,
  TransactionConfirmationParams,
  TransactionConfirmationResult,
  TokenIdentifier,
  NetworkError,
  MnemonicError,
  MessageSigningError,
  GeneralWalletError,
  ArgumentError,
  HibitIdSdkErrorCode,
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
  withLogging,
  withErrorHandling,
  cleanSensitiveData,
  getAssetTypeName
} from '@delandlabs/coin-base';
import { ChainAccount, ChainId, ChainAssetType } from '@delandlabs/hibit-basic-types';
import { deriveEcdsaPrivateKey, base } from '@delandlabs/crypto-lib';
import { CHAIN_CONFIG, ERROR_MESSAGES } from './config';
import { BaseAssetHandler } from './asset-handlers/base-asset-handler';
import { TrxNativeHandler } from './asset-handlers/trx-native-handler';
import { Trc20TokenHandler } from './asset-handlers/trc20-token-handler';
import { ConnectionManager, TronWalletInfo } from './shared/connection-manager';

// Register TRON validators
// Validator is now registered in the index.ts file using ChainValidation
// Note: TRON validator is now registered in the index.ts file using ChainValidation

// TRON address prefix byte
const ADDRESS_PREFIX_BYTE = 0x41;

/**
 * TRON wallet options interface
 */
export interface TronWalletOptions {
  /**
   * Key derivation method
   * - 'secp256k1': Use standard secp256k1 derivation (default)
   */
  keyDerivationMethod?: 'secp256k1';
}

/**
 * TRON blockchain wallet implementation supporting TRX and TRC20 tokens.
 *
 * This refactored implementation uses the Strategy Pattern to handle different
 * asset types (Native TRX and TRC20 tokens). Each asset type has its own
 * handler that encapsulates the specific logic for that asset type.
 *
 * Key improvements:
 * - Separation of concerns: Each asset handler manages its own operations
 * - Shared services: Connection management is centralized
 * - Better testability: Each component can be tested independently
 * - Easier extensibility: New asset types can be added without modifying core logic
 *
 * @example
 * ```typescript
 * const wallet = new TronChainWallet(tronMainnet, mnemonic);
 * const account = await wallet.getAccount();
 * const balance = await wallet.balanceOf({
 *   address: account.address,
 *   token: { assetType: ChainAssetType.Native }
 * });
 * ```
 */
export class TronChainWallet extends BaseChainWallet {
  // Private fields
  private walletInfo: TronWalletInfo | null = null;
  private readonly readyPromise: Promise<void>;

  // Shared services
  private readonly connectionManager: ConnectionManager;

  // Asset handlers
  private readonly assetHandlers: Map<ChainAssetType, BaseAssetHandler>;

  constructor(chainInfo: ChainInfo, mnemonic: string, options?: TronWalletOptions & { logger?: ILogger }) {
    if (chainInfo.chainId.chain !== CHAIN_CONFIG.CHAIN) {
      throw new NetworkError(HibitIdSdkErrorCode.INVALID_CONFIGURATION, ERROR_MESSAGES.INVALID_CHAIN);
    }

    const config: WalletConfig = {
      chainInfo,
      logger: options?.logger
    };
    super(config, mnemonic);

    // Initialize shared services
    this.connectionManager = new ConnectionManager(chainInfo, this.logger);

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
    const publicKeyHex = base.hex.encode(this.walletInfo.publicKey);

    return new ChainAccount(chainId, this.walletInfo.address, publicKeyHex);
  }

  /**
   * Implementation of balance query using strategy pattern
   */
  protected async balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber> {
    await this.readyPromise;

    // Validate address at wallet level
    assertValidAddressForBalance(params.address, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for TRC20
    if (params.token?.assetType === ChainAssetType.TRC20) {
      await assertValidTokenAddressForBalance(params.token.tokenAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.balanceOf(params);
  }

  /**
   * Implementation of transfer using strategy pattern
   */
  protected async transferImpl(params: TransferParams): Promise<string> {
    await this.readyPromise;

    // Common validation at wallet level
    assertValidAddressForTransaction(params.recipientAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    assertValidTransferAmount(params.amount, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for TRC20
    if (params.token?.assetType === ChainAssetType.TRC20) {
      await assertValidTokenAddressForTransaction(
        params.token.tokenAddress,
        CHAIN_CONFIG.CHAIN,
        CHAIN_CONFIG.CHAIN_NAME
      );
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.transfer(params);
  }

  /**
   * Implementation of fee estimation using strategy pattern
   */
  protected async estimateFeeImpl(params: TransferParams): Promise<BigNumber> {
    await this.readyPromise;

    // Common validation at wallet level
    assertValidAddressForTransaction(params.recipientAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    assertValidAmountForFeeEstimation(params.amount, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for TRC20
    if (params.token?.assetType === ChainAssetType.TRC20) {
      await assertValidTokenAddressForFeeEstimation(
        params.token.tokenAddress,
        CHAIN_CONFIG.CHAIN,
        CHAIN_CONFIG.CHAIN_NAME
      );
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.estimateFee(params);
  }

  /**
   * Implementation of message signing
   * Note: Only supported by native asset handler
   */
  protected async signMessageImpl(params: SignMessageParams): Promise<Uint8Array> {
    await this.readyPromise;

    // Validate message is not empty
    if (!params.message || params.message.trim() === '') {
      throw new MessageSigningError(
        HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT,
        `${CHAIN_CONFIG.CHAIN_NAME}: Message cannot be empty`
      );
    }

    // Sign message using TronWeb directly since only native supports it
    const tronWeb = this.connectionManager.getTronWeb();

    const signature = await tronWeb.trx.signMessageV2(params.message);

    // Convert signature to Uint8Array using unified hex utilities
    return base.fromHex(signature);
  }

  /**
   * Implementation of transaction confirmation waiting
   */
  protected async waitForConfirmationImpl(
    params: TransactionConfirmationParams
  ): Promise<TransactionConfirmationResult> {
    await this.readyPromise;

    const tronWeb = this.connectionManager.getTronWeb();
    const { txHash, requiredConfirmations = 1, timeoutMs = 60000, onConfirmationUpdate } = params;

    const startTime = Date.now();
    let lastConfirmations = 0;

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Get transaction info using TronWeb
        const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
        const transaction = await tronWeb.trx.getTransaction(txHash);

        if (!transaction) {
          // Transaction not found, continue polling
          await this.sleep(1000);
          continue;
        }

        if (txInfo.result === 'FAILED') {
          return {
            isConfirmed: false,
            confirmations: 0,
            requiredConfirmations,
            status: 'failed',
            blockNumber: txInfo.blockNumber,
            transactionFee: txInfo.fee ? new BigNumber(txInfo.fee).dividedBy(1_000_000) : undefined
          };
        }

        if (txInfo.blockNumber) {
          // Transaction is in a block, calculate confirmations
          const currentBlockInfo = await tronWeb.trx.getCurrentBlock();
          const currentBlockNumber = currentBlockInfo.block_header.raw_data.number;
          const confirmations = Math.max(0, currentBlockNumber - txInfo.blockNumber + 1);

          // Call confirmation update callback if provided
          if (onConfirmationUpdate && confirmations !== lastConfirmations) {
            onConfirmationUpdate(confirmations, requiredConfirmations);
            lastConfirmations = confirmations;
          }

          const isConfirmed = confirmations >= requiredConfirmations;

          return {
            isConfirmed,
            confirmations,
            requiredConfirmations,
            status: isConfirmed ? 'confirmed' : 'pending',
            blockNumber: txInfo.blockNumber,
            transactionFee: txInfo.fee ? new BigNumber(txInfo.fee).dividedBy(1_000_000) : undefined
          };
        }

        // Transaction exists but not yet in a block
        if (onConfirmationUpdate && lastConfirmations !== 0) {
          onConfirmationUpdate(0, requiredConfirmations);
          lastConfirmations = 0;
        }
      } catch (error) {
        // Transaction might not exist yet or network error, continue polling
      }

      // Wait before next poll
      await this.sleep(1000);
    }

    // Timeout reached
    return {
      isConfirmed: false,
      confirmations: lastConfirmations,
      requiredConfirmations,
      status: 'timeout'
    };
  }

  /**
   * Implementation of getAssetDecimals
   * Returns the number of decimals for the specified asset
   */
  protected async getAssetDecimalsImpl(token: TokenIdentifier): Promise<number> {
    await this.readyPromise;

    if (token.assetType === ChainAssetType.Native) {
      // TRX always has 6 decimals
      return 6;
    }

    // For TRC20 tokens, validate token address first
    if (token.assetType === ChainAssetType.TRC20) {
      await assertValidTokenAddressForDecimals(token.tokenAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);

      const handler = this.getAssetHandler(token.assetType);
      if ('getDecimals' in handler && typeof handler.getDecimals === 'function') {
        return await handler.getDecimals(token.tokenAddress);
      }
    }

    throw new Error(`Cannot get decimals for asset type: ${token.assetType}`);
  }

  /**
   * Clean up resources when wallet is no longer needed
   */
  protected destroyImpl(): void {
    // Clean up shared services
    this.connectionManager.cleanup();

    // Clean up asset handlers
    this.assetHandlers.clear();

    // Clean up wallet information (contains private key!)
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
  @withErrorHandling({ errorType: 'general' }, 'Failed to initialize TRON wallet')
  @withLogging('Initialize TRON wallet')
  @cleanSensitiveData()
  private async initializeWallet(mnemonic: string): Promise<void> {
    if (!mnemonic || mnemonic.trim() === '') {
      throw new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, `${CHAIN_CONFIG.CHAIN_NAME}: Empty mnemonic`);
    }

    // Generate keypair using secp256k1 derivation
    const privateKeyHex = await deriveEcdsaPrivateKey(mnemonic, CHAIN_CONFIG.DERIVING_PATH);
    const privateKeyBytes = base.hex.decode(privateKeyHex);

    // Convert to hex string for TronWeb
    const privateKey = base.hex.encode(privateKeyBytes);

    // Get public key using secp256k1
    const publicKey = secp256k1.getPublicKey(privateKeyBytes, false);

    // Generate Tron address from public key
    const address = this.generateAddress(publicKey);

    // Store wallet information
    this.walletInfo = {
      address,
      privateKey,
      publicKey
    };

    // Initialize connection manager with wallet info
    this.connectionManager.initialize(this.walletInfo);
  }

  /**
   * Initialize asset handlers after wallet is ready
   * @private
   */
  @withLogging('Initialize TRON asset handlers')
  private initializeAssetHandlers(): void {
    // Create and register Native TRX handler
    const nativeHandler = new TrxNativeHandler(this.connectionManager, this.logger);
    this.assetHandlers.set(ChainAssetType.Native, nativeHandler);

    // Create and register TRC20 handler
    const trc20Handler = new Trc20TokenHandler(this.connectionManager, this.logger);
    this.assetHandlers.set(ChainAssetType.TRC20, trc20Handler);
  }

  /**
   * Get the appropriate asset handler for the given asset type
   * @private
   */
  private getAssetHandler(assetType: ChainAssetType | undefined): BaseAssetHandler {
    if (assetType === undefined) {
      throw new ArgumentError(
        HibitIdSdkErrorCode.INVALID_ARGUMENT,
        `${CHAIN_CONFIG.CHAIN_NAME}: Missing asset type`,
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
   * Generate TRON address from public key
   * @private
   */
  private generateAddress(publicKey: Uint8Array): string {
    // Remove the first byte (0x04) from uncompressed public key
    const publicKeyWithoutPrefix = publicKey.slice(1);

    // Hash the public key using Keccak256
    const hash = base.keccak_256(publicKeyWithoutPrefix);

    // Take the last 20 bytes
    const addressBytes = hash.slice(-20);

    // Add Tron address prefix
    const addressWithPrefix = new Uint8Array(21);
    addressWithPrefix[0] = ADDRESS_PREFIX_BYTE;
    addressWithPrefix.set(addressBytes, 1);

    // Encode to base58check
    const address = base.toBase58Check(addressWithPrefix);

    return address;
  }

  /**
   * Sleep utility for polling delays
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
