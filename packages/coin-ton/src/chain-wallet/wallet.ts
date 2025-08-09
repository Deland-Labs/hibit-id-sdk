import BigNumber from 'bignumber.js';
import { deriveEd25519PrivateKey, base } from '@delandlabs/crypto-lib';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import nacl from 'tweetnacl';
import { ChainAccount, ChainNetwork, ChainType, ChainAssetType } from '@delandlabs/hibit-basic-types';
import {
  BaseChainWallet,
  WalletConfig,
  ChainInfo,
  NetworkError,
  MessageSigningError,
  GeneralWalletError,
  ArgumentError,
  HibitIdSdkErrorCode,
  BalanceQueryParams,
  TransferParams,
  SignMessageParams,
  TokenIdentifier,
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
  TransactionConfirmationParams,
  TransactionConfirmationResult,
  withLogging,
  clearAllCaches,
  Cacheable,
  cleanSensitiveData,
  getAssetTypeName
} from '@delandlabs/coin-base';
import type { KeyPair } from '@ton/crypto';

export interface TonWalletOptions {
  keyDerivationMethod?: 'ton-native' | 'ed25519';
}
import { TON_CONFIG, TON_CACHE_CONFIG } from './config';
import { BaseAssetHandler, TonNativeHandler, JettonHandler } from './asset-handlers';
import { sleep } from './utils';

// Register TON validators

// Note: TON validator is now registered in the index.ts file using ChainValidation

/**
 * TON blockchain wallet implementation supporting native TON and Jetton tokens.
 *
 * This refactored implementation uses the Strategy Pattern to handle different
 * asset types (Native TON and Jetton tokens). Each asset type has its own
 * handler that encapsulates the specific logic for that asset type.
 *
 * Key features:
 * - Supports both TON native and Ed25519 key derivation
 * - TON Connect protocol integration
 * - Comprehensive caching strategy with decorators
 * - Retry mechanism for network operations
 * - Asset-specific handlers for clean separation of concerns
 *
 * Architecture improvements:
 * - Separation of concerns: Each asset handler manages its own operations
 * - Shared services: Connection and key management are centralized
 * - Better testability: Each component can be tested independently
 * - Easier extensibility: New asset types can be added without modifying core logic
 *
 * @example
 * ```typescript
 * const wallet = new TonChainWallet(chainInfo, mnemonic, { logger });
 * const balance = await wallet.balanceOf({ address, token: { assetType: NATIVE_ASSET } });
 * ```
 */
export class TonChainWallet extends BaseChainWallet {
  // Private fields
  private keyPair: KeyPair | null = null;
  private client: TonClient | null = null;
  private wallet: WalletContractV4 | null = null;
  private readonly readyPromise: Promise<void>;

  // Asset handlers
  private readonly assetHandlers: Map<ChainAssetType, BaseAssetHandler> = new Map();

  // Key derivation method
  private keyDerivationMethod: 'ton-native' | 'ed25519' = 'ton-native';

  constructor(chainInfo: ChainInfo, mnemonic: string, options?: TonWalletOptions & { logger?: ILogger }) {
    if (chainInfo.chainId.chain !== ChainType.Ton) {
      throw new NetworkError(
        HibitIdSdkErrorCode.INVALID_CONFIGURATION,
        `${TON_CONFIG.CHAIN_NAME}: Invalid chain configuration`
      );
    }

    const config: WalletConfig = {
      chainInfo,
      logger: options?.logger
    };
    super(config, mnemonic);

    // Set key derivation method
    if (options?.keyDerivationMethod) {
      this.keyDerivationMethod = options.keyDerivationMethod === 'ed25519' ? 'ed25519' : 'ton-native';
    }

    // Create ready promise
    this.readyPromise = createReadyPromise(async () => {
      await this.initializeWallet(mnemonic);
      this.initializeAssetHandlers();
    });
  }

  // ============================================
  // Public methods
  // ============================================

  // ============================================
  // Protected methods (BaseChainWallet implementation)
  // ============================================

  /**
   * Get wallet account information
   */
  protected async getAccountImpl(): Promise<ChainAccount> {
    await this.readyPromise;
    const address = this.wallet!.address;
    return new ChainAccount(this.chainInfo.chainId, address.toRawString(), this.keyPair!.publicKey.toString('hex'));
  }

  /**
   * Sign message - implemented directly in wallet (TON native signing)
   */
  protected async signMessageImpl(params: SignMessageParams): Promise<Uint8Array> {
    await this.readyPromise;
    const { message } = params;

    if (!message || message.length === 0) {
      throw new MessageSigningError(
        HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT,
        `${TON_CONFIG.CHAIN_NAME}: Message is empty`
      );
    }

    const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;

    const signature = nacl.sign.detached(messageBytes, this.keyPair!.secretKey);
    return signature;
  }

  /**
   * Query balance - delegates to appropriate handler
   */
  protected async balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber> {
    await this.readyPromise;

    // Validate address using coin-base validators
    assertValidAddressForBalance(params.address, ChainType.Ton, TON_CONFIG.CHAIN_NAME);

    // Validate token address for Jetton
    if (params.token?.assetType === ChainAssetType.Jetton) {
      await assertValidTokenAddressForBalance(params.token.tokenAddress, ChainType.Ton, TON_CONFIG.CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return handler.balanceOf(params);
  }

  /**
   * Transfer assets - delegates to appropriate handler
   */
  protected async transferImpl(params: TransferParams): Promise<string> {
    await this.readyPromise;

    // Validate address and amount using coin-base validators
    assertValidAddressForTransaction(params.recipientAddress, ChainType.Ton, TON_CONFIG.CHAIN_NAME);
    assertValidTransferAmount(params.amount, TON_CONFIG.CHAIN_NAME);

    // Validate token address for Jetton
    if (params.token?.assetType === ChainAssetType.Jetton) {
      await assertValidTokenAddressForTransaction(params.token.tokenAddress, ChainType.Ton, TON_CONFIG.CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return handler.transfer(params);
  }

  /**
   * Estimate transfer fee - delegates to appropriate handler
   */
  protected async estimateFeeImpl(params: TransferParams): Promise<BigNumber> {
    await this.readyPromise;

    // Validate address and amount for fee estimation
    assertValidAddressForFeeEstimation(params.recipientAddress, ChainType.Ton, TON_CONFIG.CHAIN_NAME);
    assertValidAmountForFeeEstimation(params.amount, TON_CONFIG.CHAIN_NAME);

    // Validate token address for Jetton
    if (params.token?.assetType === ChainAssetType.Jetton) {
      await assertValidTokenAddressForFeeEstimation(params.token.tokenAddress, ChainType.Ton, TON_CONFIG.CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return handler.estimateFee(params);
  }

  /**
   * Clean up wallet resources
   */
  protected destroyImpl(): void {
    // Clear references to prevent memory leaks
    cleanupReferences(this, ['keyPair', 'client', 'wallet']);

    // Clear all caches
    clearAllCaches();
  }

  // ============================================
  // Private methods
  // ============================================

  /**
   * Initialize the wallet from mnemonic
   * @private
   */
  @withLogging('Initialize wallet')
  @cleanSensitiveData()
  private async initializeWallet(mnemonic: string): Promise<void> {
    // Get RPC endpoint
    const endpoint = await this.getRpcEndpoint();

    // Initialize TON client
    this.client = new TonClient({ endpoint });

    // Derive key pair using configured method (strict mode - no fallback)
    if (this.keyDerivationMethod === 'ed25519') {
      await this.deriveEd25519KeyPair(mnemonic);
    } else {
      // Use TON native derivation without fallback
      const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
      this.keyPair = keyPair;
    }

    // Create wallet contract
    const walletContract = WalletContractV4.create({
      workchain: 0,
      publicKey: this.keyPair!.publicKey
    });
    this.wallet = walletContract;

    // Logging handled by decorator
  }

  /**
   * Derive Ed25519 key pair from mnemonic
   * @private
   */
  @withLogging('Derive Ed25519 key pair')
  @cleanSensitiveData()
  private async deriveEd25519KeyPair(mnemonic: string): Promise<void> {
    const privateKeyHex = await deriveEd25519PrivateKey(mnemonic, TON_CONFIG.DERIVING_PATH, false, 'hex' as any);
    const privateKeyBytes = base.fromHex(privateKeyHex);
    const keyPair = nacl.sign.keyPair.fromSeed(privateKeyBytes.slice(0, 32));
    const combinedKey = base.concatBytes(keyPair.secretKey.slice(0, 32), keyPair.publicKey);
    this.keyPair = {
      publicKey: Buffer.from(keyPair.publicKey),
      secretKey: Buffer.from(combinedKey)
    };
  }

  /**
   * Initialize asset handlers after wallet is ready
   * @private
   */
  @withLogging('Initialize asset handlers')
  private initializeAssetHandlers(): void {
    if (!this.client || !this.wallet || !this.keyPair) {
      throw new Error('Wallet not initialized');
    }

    // Create and register Native handler
    const nativeHandler = new TonNativeHandler(this.client, this.wallet, this.keyPair, this.logger);
    this.assetHandlers.set(ChainAssetType.Native, nativeHandler);

    // Create and register Jetton handler
    const jettonHandler = new JettonHandler(this.client, this.wallet, this.keyPair, this.logger);
    this.assetHandlers.set(ChainAssetType.Jetton, jettonHandler);

    // Logging handled by decorator
  }

  /**
   * Get the appropriate asset handler for the given asset type
   * @private
   */
  private getAssetHandler(assetType: ChainAssetType | undefined): BaseAssetHandler {
    if (assetType === undefined) {
      throw new ArgumentError(
        HibitIdSdkErrorCode.INVALID_ARGUMENT,
        `${TON_CONFIG.CHAIN_NAME}: Missing asset type in token parameter`,
        { argumentName: 'assetType', expectedType: 'ChainAssetType' }
      );
    }

    const handler = this.assetHandlers.get(assetType);

    if (!handler) {
      throw new GeneralWalletError(
        HibitIdSdkErrorCode.UNSUPPORTED_ASSET_TYPE,
        `${TON_CONFIG.CHAIN_NAME}: Asset type ${getAssetTypeName(assetType)} is not supported`
      );
    }

    return handler;
  }

  /**
   * Get RPC endpoint with caching
   * @private
   */
  @Cacheable({
    ttl: TON_CACHE_CONFIG.RPC_ENDPOINT.ttl,
    max: TON_CACHE_CONFIG.RPC_ENDPOINT.max,
    key: function (this: TonChainWallet) {
      const networkType = this.chainInfo?.chainId?.network === ChainNetwork.TonTestNet ? 'testnet' : 'mainnet';
      return TON_CACHE_CONFIG.RPC_ENDPOINT.key(networkType);
    },
    logger: function (this: TonChainWallet) {
      return this.logger;
    }
  })
  @withLogging('Get RPC endpoint', undefined, (result: any) => ({ endpoint: result }))
  private async getRpcEndpoint(): Promise<string> {
    // Use RPC URL from chainInfo if available
    if (this.chainInfo.rpc && this.chainInfo.rpc.primary) {
      // Logging handled by decorator
      return this.chainInfo.rpc.primary;
    }

    // Fallback to default endpoints
    const endpoint = this.isTestNetwork()
      ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
      : 'https://toncenter.com/api/v2/jsonRPC';

    // Logging handled by decorator

    return endpoint;
  }

  /**
   * Check if using testnet
   * @private
   */
  private isTestNetwork(): boolean {
    return this.chainInfo.chainId.network === ChainNetwork.TonTestNet;
  }

  /**
   * Get current sequence number
   * @private
   */
  private async getCurrentSeqno(): Promise<number> {
    const openedWallet = this.client!.open(this.wallet!);
    return (await openedWallet.getSeqno()) || 0;
  }


  /**
   * Wait for transaction confirmation
   * TON uses sequence number increment as confirmation mechanism
   */
  protected async waitForConfirmationImpl(
    params: TransactionConfirmationParams
  ): Promise<TransactionConfirmationResult> {
    await this.readyPromise;

    const startTime = Date.now();
    const timeout = params.timeoutMs || TON_CONFIG.CONFIRMATION_TIMEOUT_MS;
    const requiredConfirmations = params.requiredConfirmations || 1;

    // For TON, we use sequence number increment to confirm transaction
    // This is the standard approach as TON doesn't have traditional block confirmations
    const initialSeqno = await this.getCurrentSeqno();
    let currentConfirmations = 0;

    while (Date.now() - startTime < timeout) {
      const currentSeqno = await this.getCurrentSeqno();

      if (currentSeqno > initialSeqno) {
        currentConfirmations = currentSeqno - initialSeqno;

        if (params.onConfirmationUpdate) {
          params.onConfirmationUpdate(currentConfirmations, requiredConfirmations);
        }

        if (currentConfirmations >= requiredConfirmations) {
          return {
            isConfirmed: true,
            confirmations: currentConfirmations,
            requiredConfirmations,
            status: 'confirmed'
          };
        }
      }

      await sleep(TON_CONFIG.CONFIRMATION_CHECK_INTERVAL_MS);
    }

    return {
      isConfirmed: false,
      confirmations: currentConfirmations,
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
      // TON always has 9 decimals
      return 9;
    }

    // For Jetton tokens, validate token address first
    if (token.assetType === ChainAssetType.Jetton) {
      await assertValidTokenAddressForDecimals(token.tokenAddress, ChainType.Ton, TON_CONFIG.CHAIN_NAME);

      const handler = this.getAssetHandler(token.assetType);
      if ('getDecimals' in handler && typeof handler.getDecimals === 'function') {
        return await handler.getDecimals(token.tokenAddress);
      }
    }

    throw new Error(`Cannot get decimals for asset type: ${token.assetType}`);
  }
}

// Export TonConnect types for convenience
// export type { TonConnect } from '../ton-connect';
