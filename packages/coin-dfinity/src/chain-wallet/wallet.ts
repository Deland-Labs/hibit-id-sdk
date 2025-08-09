import BigNumber from 'bignumber.js';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { v3ResponseBody } from '@dfinity/agent';
import * as cbor from 'cborg';
import {
  Icrc49CallCanisterRequest,
  Icrc49CallCanisterResult,
  IcrcErrorCode,
  JsonRpcResponseError,
  JsonRpcResponseSuccess
} from './types';
import { buildJsonRpcError, buildJsonRpcResponse } from './utils';
import {
  BaseChainWallet,
  WalletConfig,
  ChainInfo,
  SignMessageParams,
  BalanceQueryParams,
  TransferParams,
  TransactionConfirmationParams,
  TransactionConfirmationResult,
  TokenIdentifier,
  ILogger,
  NetworkError,
  MessageSigningError,
  GeneralWalletError,
  ArgumentError,
  HibitIdSdkErrorCode,
  createReadyPromise,
  assertValidAddressForBalance,
  assertValidAddressForTransaction,
  assertValidTransferAmount,
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
import { ChainAccount, ChainAssetType } from '@delandlabs/hibit-basic-types';
import { base, deriveEcdsaPrivateKey, clearSensitiveArrays } from '@delandlabs/crypto-lib';
import { CHAIN_CONFIG } from './config';
import { AgentManager } from './shared/agent-manager';
import { BaseAssetHandler, IcpNativeHandler, IcrcTokenHandler } from './asset-handlers';

// Register Dfinity validators
// Supports both Principal (for ICP native and ICRC tokens) and AccountIdentifier (for ICP native only)
// Validator is now registered in the index.ts file using ChainValidation
// Note: Dfinity validator is now registered in the index.ts file using ChainValidation

/**
 * Internet Computer Protocol (ICP) blockchain wallet implementation.
 *
 * This wallet supports:
 * - Native ICP token transfers and balance queries
 * - ICRC-1 standard tokens (fungible tokens)
 * - ICRC standards: 25, 27, 29, 32, 49
 * - Both Principal and AccountIdentifier address formats
 * - Cross-environment support (browser and Node.js)
 *
 * Architecture:
 * - Uses Strategy pattern with asset handlers for different token types
 * - Separates concerns: AgentManager for connections, decorators for caching
 * - Each asset type has its own dedicated handler for maintainability
 *
 * @example
 * ```typescript
 * const wallet = new IcpChainWallet(chainInfo, mnemonic);
 * const account = await wallet.getAccount();
 * const balance = await wallet.balanceOf({ address: account.address, token });
 * ```
 *
 * @extends BaseChainWallet
 */
export class IcpChainWallet extends BaseChainWallet {
  private readonly readyPromise: Promise<void>;
  private readonly agentManager: AgentManager;
  private readonly assetHandlers: Map<ChainAssetType, BaseAssetHandler>;

  constructor(chainInfo: ChainInfo, mnemonic: string, options?: { logger?: ILogger }) {
    if (chainInfo.chainId.chain !== CHAIN_CONFIG.CHAIN) {
      throw new NetworkError(HibitIdSdkErrorCode.INVALID_CONFIGURATION, `${CHAIN_CONFIG.CHAIN_NAME}: invalid chain type`);
    }

    const config: WalletConfig = {
      chainInfo,
      logger: options?.logger
    };
    super(config, mnemonic);

    // Initialize managers
    this.agentManager = new AgentManager(chainInfo, this.logger);

    // Initialize an asset handlers map
    this.assetHandlers = new Map<ChainAssetType, BaseAssetHandler>();

    this.readyPromise = createReadyPromise(() => this.initWallet(mnemonic));
  }

  // ========== PUBLIC METHODS ==========

  /**
   * Execute ICRC-49 call canister standard.
   *
   * Allows calling arbitrary canister methods with proper authentication.
   * This is part of the ICRC-49 standard for wallet-canister interactions.
   *
   * @param request - The ICRC-49 call request containing canister ID, method, and arguments
   * @returns JSON-RPC response with call result or error
   *
   * @example
   * ```typescript
   * const result = await wallet.icrc49CallCanister({
   *   id: 1,
   *   jsonrpc: '2.0',
   *   method: 'icrc49_call_canister',
   *   params: {
   *     canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
   *     sender: account.address,
   *     method: 'transfer',
   *     arg: base64EncodedArgument
   *   }
   * });
   * ```
   */
  @withLogging('icrc49CallCanister', (args: readonly [Icrc49CallCanisterRequest]) => ({
    canisterId: args[0]?.params?.canisterId,
    method: args[0]?.params?.method,
    sender: args[0]?.params?.sender,
    requestId: args[0]?.id
  }))
  public async icrc49CallCanister(
    request: Icrc49CallCanisterRequest
  ): Promise<JsonRpcResponseSuccess<Icrc49CallCanisterResult> | JsonRpcResponseError> {
    await this.readyPromise;

    try {
      const agent = this.agentManager.getAgent();
      const params = request.params;
      const argBytes = base.fromBase64(params.arg);

      const response = await agent.call(params.canisterId, {
        methodName: params.method,
        arg: new Uint8Array(argBytes.buffer),
        callSync: true
      });

      if (response.response.status > 202) {
        throw new NetworkError(
          HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
          `${CHAIN_CONFIG.CHAIN_NAME}: ICRC49 call failed with http status ${response.response.status}`
        );
      }

      const result = buildJsonRpcResponse(request.id, {
        contentMap: base.toBase64(new Uint8Array(cbor.encode(response.requestDetails))),
        certificate: base.toBase64(new Uint8Array((response.response.body as v3ResponseBody)?.certificate!))
      });

      return result;
    } catch (e: unknown) {
      // For JSON-RPC methods, we need to return errors in JSON-RPC format
      // instead of throwing them, so we don't use @withErrorHandling
      return buildJsonRpcError(
        request.id,
        IcrcErrorCode.GenericError,
        e instanceof Error ? e.message : JSON.stringify(e)
      );
    }
  }

  // ========== PROTECTED METHODS ==========

  protected async getAccountImpl(): Promise<ChainAccount> {
    await this.readyPromise;
    const identity = this.agentManager.getIdentity();
    const address = identity.getPrincipal().toString();
    return new ChainAccount(
      this.chainInfo.chainId,
      address,
      base.toHex(new Uint8Array(identity.getPublicKey().toRaw()))
    );
  }

  protected async signMessageImpl(params: SignMessageParams): Promise<Uint8Array> {
    const { message } = params;
    if (!message) {
      throw new MessageSigningError(
        HibitIdSdkErrorCode.INVALID_MESSAGE_FORMAT,
        `${CHAIN_CONFIG.CHAIN_NAME}: Missing sign data`
      );
    }

    await this.readyPromise;
    const identity = this.agentManager.getIdentity();
    const messageBytes = base.toUtf8(message);
    const signature = await identity.sign(new Uint8Array(messageBytes.buffer));

    return new Uint8Array(signature);
  }

  protected async balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber> {
    await this.readyPromise;

    // Common address validation using coin-base validator
    assertValidAddressForBalance(params.address, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for ICRC tokens
    if (params.token?.assetType === ChainAssetType.ICRC3) {
      await assertValidTokenAddressForBalance(params.token.tokenAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.balanceOf(params);
  }

  protected async transferImpl(params: TransferParams): Promise<string> {
    await this.readyPromise;

    assertValidAddressForTransaction(params.recipientAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);
    assertValidTransferAmount(params.amount, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for ICRC tokens
    if (params.token?.assetType === ChainAssetType.ICRC3) {
      await assertValidTokenAddressForTransaction(
        params.token.tokenAddress,
        CHAIN_CONFIG.CHAIN,
        CHAIN_CONFIG.CHAIN_NAME
      );
    }

    const handler = this.getAssetHandler(params.token?.assetType);
    return await handler.transfer(params);
  }

  protected async estimateFeeImpl(params: TransferParams): Promise<BigNumber> {
    await this.readyPromise;

    // Add validation for fee estimation amount
    assertValidAmountForFeeEstimation(params.amount, CHAIN_CONFIG.CHAIN_NAME);

    // Validate token address for ICRC tokens
    if (params.token?.assetType === ChainAssetType.ICRC3) {
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
   * Wait for transaction confirmation on Dfinity blockchain.
   *
   * In Dfinity, once a transfer returns a block height, the transaction is already confirmed.
   * This method simply verifies that the transaction exists at the given block height.
   * Unlike other blockchains, Dfinity doesn't require multiple confirmations for security.
   *
   * @param params - Transaction confirmation parameters
   * @returns Promise resolving to confirmation result
   */
  protected async waitForConfirmationImpl(
    params: TransactionConfirmationParams
  ): Promise<TransactionConfirmationResult> {
    await this.readyPromise;

    const { txHash, requiredConfirmations = 1, timeoutMs = 30000, onConfirmationUpdate } = params;

    // Parse block height from transaction hash
    const blockHeight = this.parseBlockHeight(txHash);

    const startTime = Date.now();

    // In Dfinity, we only need to verify the transaction exists at the given block height
    // No need to wait for multiple confirmations
    while (Date.now() - startTime < timeoutMs) {
      try {
        const exists = await this.verifyTransactionExists(blockHeight);

        if (exists) {
          // Notify callback if provided
          if (onConfirmationUpdate) {
            onConfirmationUpdate(1, requiredConfirmations);
          }

          return {
            isConfirmed: true,
            confirmations: 1, // Dfinity has instant finality
            requiredConfirmations,
            status: 'confirmed',
            blockNumber: blockHeight
          };
        }

        // Short delay before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        // If it's a timeout, break the loop
        if (Date.now() - startTime >= timeoutMs) {
          break;
        }

        // For other errors, continue retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Timeout reached
    return {
      isConfirmed: false,
      confirmations: 0,
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

    if (token.assetType === ChainAssetType.ICP) {
      // ICP always has 8 decimals
      return 8;
    }

    // For ICRC tokens, validate token address first
    if (token.assetType === ChainAssetType.ICRC3) {
      await assertValidTokenAddressForDecimals(token.tokenAddress, CHAIN_CONFIG.CHAIN, CHAIN_CONFIG.CHAIN_NAME);

      const handler = this.getAssetHandler(token.assetType);
      if ('getDecimals' in handler && typeof handler.getDecimals === 'function') {
        return await handler.getDecimals(token.tokenAddress);
      }
    }

    throw new Error(`Cannot get decimals for asset type: ${token.assetType}`);
  }

  protected destroyImpl(): void {
    // Clean up asset handlers
    for (const handler of this.assetHandlers.values()) {
      handler.cleanup();
    }
    this.assetHandlers.clear();

    // Clean up managers
    this.agentManager.cleanup();
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Get the asset handler for the specified asset type
   * @param assetType - The asset type to get handler for
   * @returns The corresponding asset handler
   * @throws Error if an asset type is not supported
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
      const supportedTypes = this.getSupportedAssetTypes()
        .map((t) => getAssetTypeName(t))
        .join(', ');
      throw new GeneralWalletError(
        HibitIdSdkErrorCode.UNSUPPORTED_ASSET_TYPE,
        `${CHAIN_CONFIG.CHAIN_NAME}: Asset type ${getAssetTypeName(assetType)} is not supported. Supported types: ${supportedTypes}`
      );
    }
    return handler;
  }

  /**
   * Get all supported asset types
   * @returns Array of supported ChainAssetType values
   */
  private getSupportedAssetTypes(): ChainAssetType[] {
    return Array.from(this.assetHandlers.keys());
  }

  /**
   * Initialize asset handlers for all supported asset types
   */
  @withLogging('Initialize asset handlers')
  private initAssetHandlers(): void {
    // Register Native ICP handler
    const nativeHandler = new IcpNativeHandler(this.agentManager, this.logger);
    this.assetHandlers.set(ChainAssetType.ICP, nativeHandler);

    // Register ICRC token handler
    const icrcHandler = new IcrcTokenHandler(this.agentManager, this.logger);
    this.assetHandlers.set(ChainAssetType.ICRC3, icrcHandler);
  }

  /**
   * Initialize the wallet with the provided mnemonic
   * @param mnemonic - The mnemonic phrase to derive keys from
   */
  @withErrorHandling({ errorType: 'general' }, 'Failed to initialize wallet')
  @withLogging('Initialize wallet')
  @cleanSensitiveData()
  private async initWallet(mnemonic: string): Promise<void> {
    // Generate identity from mnemonic
    const privateKeyHex = await deriveEcdsaPrivateKey(mnemonic, CHAIN_CONFIG.DERIVING_PATH);
    const privateKeyBytes = base.fromHex(privateKeyHex);

    // Create a copy for the identity since it will reference the buffer
    const privateKeyBuffer = new Uint8Array(privateKeyBytes).buffer;
    const identity = Secp256k1KeyIdentity.fromSecretKey(new Uint8Array(privateKeyBuffer));

    // Clear sensitive data from memory
    clearSensitiveArrays(privateKeyBytes);

    // Initialize agent manager
    await this.agentManager.initialize(identity);

    // Initialize asset handlers
    this.initAssetHandlers();
  }

  /**
   * Parse block height from transaction hash.
   * In Dfinity, the transaction hash is typically the block height as a string.
   *
   * @param txHash - Transaction hash (block height as string)
   * @returns Block height as number
   */
  private parseBlockHeight(txHash: string): number {
    const blockHeight = parseInt(txHash, 10);
    if (isNaN(blockHeight) || blockHeight < 0) {
      throw new Error(`Invalid transaction hash format: ${txHash}. Expected a valid block height.`);
    }
    return blockHeight;
  }

  /**
   * Verify that a transaction exists at the given block height.
   * This method queries the ledger to check if the block exists.
   *
   * @param blockHeight - Block height to verify
   * @returns Promise resolving to true if transaction exists
   */
  @withLogging(
    'Verify transaction exists',
    (args: [number]) => ({ blockHeight: args[0] }),
    (result: boolean) => ({ exists: result })
  )
  private async verifyTransactionExists(blockHeight: number): Promise<boolean> {
    try {
      // Try to get ICP native handler first (most common case)
      const icpHandler = this.assetHandlers.get(ChainAssetType.ICP) as IcpNativeHandler;
      if (icpHandler) {
        return await this.verifyIcpTransaction(icpHandler, blockHeight);
      }

      // If no ICP handler, try ICRC handler
      const icrcHandler = this.assetHandlers.get(ChainAssetType.ICRC3) as IcrcTokenHandler;
      if (icrcHandler) {
        return await this.verifyIcrcTransaction(icrcHandler, blockHeight);
      }

      // No handlers available
      return false;
    } catch (error) {
      // If there's an error querying the block, assume it doesn't exist yet
      return false;
    }
  }

  /**
   * Verify ICP native transaction exists at given block height.
   *
   * @param handler - ICP native handler
   * @param blockHeight - Block height to verify
   * @returns Promise resolving to true if transaction exists
   */
  private async verifyIcpTransaction(handler: IcpNativeHandler, blockHeight: number): Promise<boolean> {
    try {
      // Get the ledger instance from the handler
      const ledger = (handler as any).getIcpLedgerForQueries();

      // Try to query blocks starting from the target block height
      // If the block exists, the query will succeed
      const blocks = await ledger.queryBlocks({
        start: BigInt(blockHeight),
        length: BigInt(1)
      });

      // Check if we got the block we were looking for
      return blocks && blocks.blocks && blocks.blocks.length > 0;
    } catch (error) {
      // Block doesn't exist or other error
      return false;
    }
  }

  /**
   * Verify ICRC transaction exists at given block height.
   *
   * @param handler - ICRC token handler
   * @param blockHeight - Block height to verify
   * @returns Promise resolving to true if transaction exists
   */
  private async verifyIcrcTransaction(handler: IcrcTokenHandler, blockHeight: number): Promise<boolean> {
    try {
      // For ICRC tokens, we need to check if the block exists in any of the known ledgers
      // This is more complex because ICRC handlers manage multiple token ledgers

      // Get any cached ledger from the handler to test block existence
      const ledgers = (handler as any).getAllCachedLedgers();
      if (ledgers && ledgers.size > 0) {
        // Use the first available ledger to check block existence
        const firstLedger = ledgers.values().next().value;
        if (firstLedger) {
          const blocks = await firstLedger.getBlocks({
            start: BigInt(blockHeight),
            length: BigInt(1)
          });

          return blocks && blocks.blocks && blocks.blocks.length > 0;
        }
      }

      return false;
    } catch (error) {
      // Block doesn't exist or other error
      return false;
    }
  }
}
