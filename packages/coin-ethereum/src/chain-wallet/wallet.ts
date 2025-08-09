import BigNumber from 'bignumber.js';
import { Wallet } from 'ethers';
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
  assertValidAddressForFeeEstimation,
  assertValidTransferAmount,
  assertValidAmountForFeeEstimation,
  assertValidTokenAddressForDecimals,
  assertValidTokenAddressForBalance,
  assertValidTokenAddressForTransaction,
  assertValidTokenAddressForFeeEstimation,
  cleanSensitiveData,
  withLogging,
  getAssetTypeName
} from '@delandlabs/coin-base';
import { deriveEcdsaPrivateKey, base } from '@delandlabs/crypto-lib';
import { CHAIN_CONFIG, ERROR_MESSAGES } from './config';
import { BaseAssetHandler, EthNativeHandler, Erc20TokenHandler } from './asset-handlers';
import { ConnectionManager } from './shared';

// Note: Ethereum validator is now registered in the index.ts file using ChainValidation

/**
 * Ethereum blockchain wallet implementation supporting EVM-compatible chains.
 *
 * Uses the Strategy Pattern to handle different asset types (Native ETH/BNB and ERC20 tokens).
 * Each asset type has its own handler that encapsulates the specific logic for that asset type.
 *
 * Key features:
 * - Separation of concerns: Each asset handler manages its own operations
 * - Shared services: Connection and cache management are centralized
 * - Testability: Each component can be tested independently
 * - Extensibility: New asset types can be added without modifying core logic
 */
export class EthereumChainWallet extends BaseChainWallet {
  // Private fields
  private wallet: Wallet | null = null;
  private readonly readyPromise: Promise<void>;

  // Shared services
  private readonly connectionManager: ConnectionManager;

  // Asset handlers
  private readonly assetHandlers: Map<ChainAssetType, BaseAssetHandler>;

  constructor(chainInfo: ChainInfo, mnemonic: string, options?: { logger?: ILogger }) {
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

    // Initialize an asset handlers map
    this.assetHandlers = new Map();

    // Create a ready promise
    this.readyPromise = createReadyPromise(async () => {
      await this.initializeWallet(mnemonic);
      this.initializeAssetHandlers();
    });
  }

  // === PUBLIC METHODS ===

  // === PROTECTED METHODS ===

  /**
   * Implementation of getAccount
   */
  protected async getAccountImpl(): Promise<ChainAccount> {
    await this.readyPromise;

    if (!this.wallet) {
      throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
    }

    const chainId = new ChainId(this.chainInfo.chainId.chain, this.chainInfo.chainId.network);
    const publicKeyHex = this.wallet.signingKey.publicKey.substring(2); // Remove '0x' prefix

    return new ChainAccount(chainId, this.wallet.address, publicKeyHex);
  }

  /**
   * Implementation of balance query using strategy pattern
   */
  protected async balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber> {
    await this.readyPromise;

    // Common validation: address format (applies to all asset types)
    assertValidAddressForBalance(params.address, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for ERC20
    if (params.token?.assetType === ChainAssetType.ERC20) {
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

    // Common validation: recipient address and transfer amount (applies to all asset types)
    assertValidAddressForTransaction(params.recipientAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    assertValidTransferAmount(params.amount, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for ERC20
    if (params.token?.assetType === ChainAssetType.ERC20) {
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

    assertValidAddressForFeeEstimation(params.recipientAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    assertValidAmountForFeeEstimation(params.amount, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for ERC20
    if (params.token?.assetType === ChainAssetType.ERC20) {
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
   * Note: Message signing is only supported for the native chain wallet
   */
  protected async signMessageImpl(params: SignMessageParams): Promise<Uint8Array> {
    await this.readyPromise;

    if (!this.wallet) {
      throw new Error(ERROR_MESSAGES.NOT_INITIALIZED);
    }

    const signature = await this.wallet.signMessage(params.message);

    // Convert hex signature to Uint8Array using unified hex utilities
    return base.fromHex(signature);
  }

  /**
   * Clean up resources when wallet is no longer needed
   */
  protected destroyImpl(): void {
    // Clean up shared services
    this.connectionManager.cleanup();

    // Clean up asset handlers
    this.assetHandlers.clear();

    // Clean up wallet reference
    this.wallet = null;

    // Clean up any remaining references
    cleanupReferences(this, ['readyPromise']);
  }

  /**
   * Implementation of transaction confirmation waiting
   */
  protected async waitForConfirmationImpl(
    params: TransactionConfirmationParams
  ): Promise<TransactionConfirmationResult> {
    await this.readyPromise;

    const provider = this.connectionManager.getProvider();
    const requiredConfirmations = params.requiredConfirmations ?? 1;
    const timeoutMs = params.timeoutMs ?? 300000; // 5 minutes default

    // Use ethers.js built-in waitForTransaction method
    const receipt = await provider.waitForTransaction(params.txHash, requiredConfirmations, timeoutMs);

    if (!receipt) {
      return {
        isConfirmed: false,
        confirmations: 0,
        requiredConfirmations,
        status: 'timeout'
      };
    }

    // Calculate current confirmations
    const currentBlockNumber = await provider.getBlockNumber();
    const confirmations = currentBlockNumber - receipt.blockNumber + 1;

    // Call progress callback if provided
    if (params.onConfirmationUpdate) {
      params.onConfirmationUpdate(confirmations, requiredConfirmations);
    }

    // Check transaction status
    const isConfirmed = receipt.status === 1 && confirmations >= requiredConfirmations;
    const status = receipt.status === 0 ? 'failed' : isConfirmed ? 'confirmed' : 'pending';

    return {
      isConfirmed,
      confirmations,
      requiredConfirmations,
      status,
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      transactionFee: new BigNumber(receipt.gasUsed.toString()).multipliedBy(receipt.gasPrice?.toString() || '0')
    };
  }

  // === PRIVATE METHODS ===

  /**
   * Initialize the wallet from a mnemonic
   * @private
   */
  @withLogging('Initialize wallet')
  @cleanSensitiveData()
  private async initializeWallet(mnemonic: string): Promise<void> {
    if (!mnemonic || mnemonic.trim() === '') {
      throw new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, `${CHAIN_CONFIG.CHAIN_NAME}: Empty mnemonic`);
    }

    // Derive private key from mnemonic
    const privateKeyHex = await deriveEcdsaPrivateKey(mnemonic, CHAIN_CONFIG.DERIVING_PATH);

    // Create a wallet instance
    this.wallet = new Wallet(privateKeyHex);

    // Initialize connection manager with wallet
    this.connectionManager.initialize(this.wallet);
  }

  /**
   * Initialize asset handlers after wallet is ready
   * @private
   */
  private initializeAssetHandlers(): void {
    // Create and register Native handler
    const nativeHandler = new EthNativeHandler(this.connectionManager, this.logger);
    this.assetHandlers.set(ChainAssetType.Native, nativeHandler);

    // Create and register ERC20 handler
    const erc20Handler = new Erc20TokenHandler(this.connectionManager, this.logger);
    this.assetHandlers.set(ChainAssetType.ERC20, erc20Handler);
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
      // ETH and other EVM native assets always have 18 decimals
      return 18;
    }

    // For ERC20 tokens, validate token address first
    if (token.assetType === ChainAssetType.ERC20) {
      await assertValidTokenAddressForDecimals(token.tokenAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);

      const handler = this.getAssetHandler(token.assetType);
      return await handler.getDecimals(token.tokenAddress);
    }

    throw new Error(`Cannot get decimals for asset type: ${token.assetType}`);
  }
}
