import BigNumber from 'bignumber.js';
import { ChainInfo } from './types/chain';
import {
  SignMessageParams,
  BalanceQueryParams,
  TransferParams,
  TokenIdentifier,
  TransactionConfirmationParams,
  TransactionConfirmationResult
} from './types/wallet';
import { ILogger, NoOpLogger, LoggerValue } from './utils/logger';
import { MnemonicError, HibitIdSdkErrorCode } from './types/errors';
import { ChainAccount, ChainId } from '@delandlabs/hibit-basic-types';
import { validateMnemonic } from '@delandlabs/crypto-lib';
import { withErrorHandling } from './decorators/error-handling';
import { withLogging } from './decorators/logging';
import { cleanSensitiveData } from './decorators/sensitive-data';

// Constants
/**
 * Maximum length of message preview in logs to avoid logging sensitive data
 */
const MESSAGE_PREVIEW_LENGTH = 50;

/**
 * Convert ChainId to loggable object
 * @param chainId - The chain identifier to convert
 * @returns Loggable object representation of the chain ID
 */
function chainIdToLoggerValue(chainId: ChainId): LoggerValue {
  return {
    chain: chainId.chain.toString(),
    network: chainId.network.toString()
  };
}

/**
 * Convert TokenIdentifier to loggable object
 * @param token - The token identifier to convert
 * @returns Loggable object representation of the token
 */
function tokenToLoggerValue(token: TokenIdentifier): LoggerValue {
  return {
    assetType: token.assetType.toString(),
    tokenAddress: token.tokenAddress || undefined
  };
}

/**
 * Configuration for BaseChainWallet
 */
export interface WalletConfig {
  /** Chain-specific configuration and metadata */
  chainInfo: ChainInfo;
  /** Optional logger instance for wallet operations */
  logger?: ILogger;
}

/**
 * Abstract base class for blockchain wallet implementations
 *
 * This class provides the core structure and common functionality for all blockchain wallets.
 * It implements the IChainWallet interface and uses composition for key management,
 * separating concerns and improving extensibility.
 *
 * @example
 * ```typescript
 * import { BaseChainWallet, WalletConfig } from '@delandlabs/coin-base';
 * import { ChainInfo, ChainAccount, ChainId, ChainType, ChainNetwork } from '@delandlabs/hibit-basic-types';
 *
 * class MyChainWallet extends BaseChainWallet {
 *   constructor(mnemonic: string) {
 *     const config: WalletConfig = {
 *       chainInfo: {
 *         chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumMainNet),
 *         name: 'MyChain',
 *         fullName: 'My Custom Chain',
 *         icon: '/mychain-icon.svg',
 *         nativeAssetSymbol: 'MYC',
 *         isMainnet: true,
 *         isNativeGas: true,
 *         ecosystem: Ecosystem.EVM,
 *         supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
 *         explorer: 'https://mychain-explorer.com',
 *         rpc: { primary: 'https://mychain-rpc.com' }
 *       }
 *     };
 *     super(config, mnemonic);
 *   }
 *
 *   isValidAddress(address: string): boolean {
 *     return /^0x[a-fA-F0-9]{40}$/.test(address);
 *   }
 *
 *   protected async getAccountImpl(): Promise<ChainAccount> {
 *     // Derive account from mnemonic
 *     const account = await this.deriveAccount();
 *     return new ChainAccount(this.chainInfo.chainId, account.address, account.publicKey);
 *   }
 *
 *   protected async signMessageImpl(params: SignMessageParams): Promise<Uint8Array> {
 *     // Sign message with private key
 *     const signature = await this.signWithPrivateKey(params.message);
 *     return new Uint8Array(signature);
 *   }
 *
 *   protected async balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber> {
 *     // Query balance from blockchain
 *     return await this.rpcCall('getBalance', [params.address]);
 *   }
 *
 *   protected async transferImpl(params: TransferParams): Promise<string> {
 *     // Create and send transaction
 *     const tx = await this.createTransaction(params);
 *     return await this.sendTransaction(tx);
 *   }
 *
 *   protected async estimateFeeImpl(params: TransferParams): Promise<BigNumber> {
 *     // Estimate transaction fee
 *     return await this.estimateGas(params);
 *   }
 * }
 * ```
 */
export abstract class BaseChainWallet {
  // === Public Fields ===
  public readonly chainInfo: ChainInfo;

  // === Protected Fields ===
  protected readonly logger: ILogger;

  // === Constructor ===
  /**
   * Creates a new BaseChainWallet instance
   * @param config - Wallet configuration including chain info and logger
   * @param mnemonic - The mnemonic phrase for key derivation
   * @throws {MnemonicError} When mnemonic is invalid or empty
   */
  protected constructor(config: WalletConfig, mnemonic: string) {
    this.logger = config.logger ?? new NoOpLogger();
    this.chainInfo = config.chainInfo;

    // Sensitive data protection for mnemonic parameter
    try {
      // Validate mnemonic - this should happen before any other operations to fail fast
      if (!mnemonic || typeof mnemonic !== 'string') {
        throw new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Mnemonic cannot be empty');
      }

      if (!validateMnemonic(mnemonic)) {
        const words = mnemonic.trim().split(/\s+/);
        const wordCount = words.length;
        if (wordCount !== 12 && wordCount !== 24) {
          throw new MnemonicError(
            HibitIdSdkErrorCode.INVALID_MNEMONIC,
            `Invalid mnemonic length (got ${wordCount} words, expected 12 or 24)`
          );
        } else {
          throw new MnemonicError(HibitIdSdkErrorCode.INVALID_MNEMONIC, 'Invalid mnemonic phrase');
        }
      }

      this.logger.info('BaseChainWallet initialized', {
        context: 'BaseChainWallet.constructor',
        data: {
          chainName: this.chainInfo.name,
          chainId: chainIdToLoggerValue(this.chainInfo.chainId)
        }
      });

      // At this point the mnemonic has been validated and can be used by subclasses
      // Note: JavaScript doesn't provide true memory clearing for strings,
      // but we should avoid storing or logging the mnemonic parameter
    } catch (error) {
      // Error handling that protects sensitive data
      this.logger.error('BaseChainWallet initialization failed', {
        error: error instanceof Error ? error : new Error(String(error)),
        context: 'BaseChainWallet.constructor',
        data: {
          chainName: this.chainInfo.name,
          chainId: chainIdToLoggerValue(this.chainInfo.chainId)
          // Deliberately omit mnemonic from an error context
        }
      });

      // Re-throw the error without modification to preserve error type and message
      // The MnemonicError is already properly formatted
      throw error;
    }
  }

  /**
   * Retrieves the account information for this wallet
   * @returns A promise that resolves to the chain account details
   */
  @withLogging('Get account information', undefined, (result: ChainAccount) => ({ address: result.address }))
  @withErrorHandling({ errorType: 'general' }, 'Failed to get account information')
  public async getAccount(): Promise<ChainAccount> {
    return this.getAccountImpl();
  }

  /**
   * Internal implementation for getting account information
   * Must be implemented by subclasses
   */
  protected abstract getAccountImpl(): Promise<ChainAccount>;

  /**
   * Signs a message using the wallet's cryptographic key
   * Implementation is delegated to subclasses
   * @param params - Parameters for message signing
   * @returns A promise that resolves to the signature as Uint8Array
   */
  @withLogging(
    'Sign message',
    (args: [SignMessageParams]) => ({ message: args[0].message.substring(0, MESSAGE_PREVIEW_LENGTH) + '...' }),
    (result: Uint8Array) => ({ signatureLength: result.length })
  )
  @withErrorHandling({ errorType: 'signing' }, 'Failed to sign message')
  @cleanSensitiveData()
  public async signMessage(params: SignMessageParams): Promise<Uint8Array> {
    return this.signMessageImpl(params);
  }

  /**
   * Internal implementation for message signing
   * Must be implemented by subclasses
   */
  protected abstract signMessageImpl(params: SignMessageParams): Promise<Uint8Array>;

  /**
   * Queries the balance of a token or native asset for an address
   * @param params - Parameters for balance query including address and token info
   * @returns A promise that resolves to the balance as a BigNumber
   */
  @withLogging(
    'Query balance',
    (args: [BalanceQueryParams]) => ({
      address: args[0].address,
      token: tokenToLoggerValue(args[0].token)
    }),
    (result: BigNumber) => ({ balance: result.toString() })
  )
  @withErrorHandling({ errorType: 'balance' }, 'Failed to query balance')
  public async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    return this.balanceOfImpl(params);
  }

  /**
   * Internal implementation for balance query
   * Must be implemented by subclasses
   */
  protected abstract balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber>;

  /**
   * Transfers tokens to another address
   * @param params - Parameters for the transfer
   * @returns A promise that resolves to the transaction hash
   */
  @withLogging(
    'Transfer tokens',
    (args: [TransferParams]) => ({
      to: args[0].recipientAddress,
      amount: args[0].amount.toString(),
      token: tokenToLoggerValue(args[0].token)
    }),
    (result: string) => ({ txHash: result })
  )
  @withErrorHandling({ errorType: 'transaction' }, 'Failed to transfer tokens')
  @cleanSensitiveData()
  public async transfer(params: TransferParams): Promise<string> {
    return this.transferImpl(params);
  }

  /**
   * Internal implementation for token transfer
   * Must be implemented by subclasses
   */
  protected abstract transferImpl(params: TransferParams): Promise<string>;

  /**
   * Estimates the fee for a transfer transaction
   * @param params - Parameters for fee estimation (same as transfer params)
   * @returns A promise that resolves to the estimated fee as a BigNumber
   */
  @withLogging(
    'Estimate transfer fee',
    (args: [TransferParams]) => ({
      to: args[0].recipientAddress,
      amount: args[0].amount.toString(),
      token: tokenToLoggerValue(args[0].token)
    }),
    (result: BigNumber) => ({ estimatedFee: result.toString() })
  )
  @withErrorHandling({ errorType: 'fee' }, 'Failed to estimate fee')
  public async estimateFee(params: TransferParams): Promise<BigNumber> {
    return this.estimateFeeImpl(params);
  }

  /**
   * Internal implementation for fee estimation
   * Must be implemented by subclasses
   */
  protected abstract estimateFeeImpl(params: TransferParams): Promise<BigNumber>;

  /**
   * Waits for transaction confirmation on the blockchain
   * @param params - Confirmation parameters including transaction hash and requirements
   * @returns A promise that resolves to the confirmation result
   *
   * @example
   * ```typescript
   * // Wait with default settings
   * const result = await wallet.waitForConfirmation({
   *   txHash: "0x123..."
   * });
   *
   * // Custom confirmations and timeout
   * const result = await wallet.waitForConfirmation({
   *   txHash: "0x123...",
   *   requiredConfirmations: 6,
   *   timeoutMs: 300000, // 5 minutes
   *   onConfirmationUpdate: (current, required) => {
   *     console.log(`Progress: ${current}/${required}`);
   *   }
   * });
   *
   * if (result.isConfirmed) {
   *   console.log(`Transaction confirmed!`);
   * }
   * ```
   */
  @withLogging(
    'Wait for transaction confirmation',
    (args: [TransactionConfirmationParams]) => ({
      txHash: args[0].txHash,
      requiredConfirmations: args[0].requiredConfirmations,
      timeoutMs: args[0].timeoutMs
    }),
    (result: TransactionConfirmationResult) => ({
      isConfirmed: result.isConfirmed,
      confirmations: result.confirmations,
      status: result.status,
      blockHash: result.blockHash,
      blockNumber: result.blockNumber
    })
  )
  @withErrorHandling({ errorType: 'transaction' }, 'Failed to wait for transaction confirmation')
  public async waitForConfirmation(params: TransactionConfirmationParams): Promise<TransactionConfirmationResult> {
    return this.waitForConfirmationImpl(params);
  }

  /**
   * Internal implementation for transaction confirmation waiting
   * Must be implemented by subclasses to handle chain-specific confirmation logic
   *
   * Implementation guidelines:
   * - Ethereum/EVM: Use block depth-based confirmations
   * - TON: Use masterchain confirmation status
   * - Tron: Use block depth with 19-20 confirmations default
   * - Solana: Use commitment levels (processed -> confirmed -> finalized)
   * - Kaspa: Use DAG confirmation with UTXO status
   * - Dfinity: Use consensus confirmation status
   */
  protected abstract waitForConfirmationImpl(
    params: TransactionConfirmationParams
  ): Promise<TransactionConfirmationResult>;

  /**
   * Cleans up resources used by the wallet to prevent memory leaks
   * This method should be called when the wallet is no longer needed
   */
  @withLogging('Cleanup wallet resources', undefined, () => ({ cleaned: true }))
  public destroy(): void {
    try {
      this.destroyImpl();
      this.logger.info('BaseChainWallet resources cleaned up', {
        context: 'BaseChainWallet.destroy'
      });
    } catch (error) {
      this.logger.error('Error cleaning up BaseChainWallet resources', {
        error: error instanceof Error ? error : new Error(String(error)),
        context: 'BaseChainWallet.destroy'
      });
    }
  }

  /**
   * Internal implementation for resource cleanup
   * Should be implemented by subclasses to clean up specific resources
   * Default implementation does nothing
   */
  protected destroyImpl(): void {
    // Default implementation - no cleanup needed at base level
    // Subclasses should override this to clean up specific resources like:
    // - Timers and intervals
    // - WebSocket connections
    // - Event listeners
    // - Cache data
  }

  /**
   * Get decimals for a specific asset
   * @param token - Token identifier to get decimals for
   * @returns A promise that resolves to the number of decimals
   *
   * @example
   * ```typescript
   * // Get native asset decimals
   * const nativeDecimals = await wallet.getAssetDecimals({
   *   assetType: ChainAssetType.Native
   * });
   *
   * // Get token decimals
   * const tokenDecimals = await wallet.getAssetDecimals({
   *   assetType: ChainAssetType.ERC20,
   *   tokenAddress: "0x123..."
   * });
   * ```
   */
  @withLogging(
    'Get asset decimals',
    (args: [TokenIdentifier]) => ({
      token: tokenToLoggerValue(args[0])
    }),
    (result: number) => ({ decimals: result })
  )
  @withErrorHandling({ errorType: 'general' }, 'Failed to get asset decimals')
  public async getAssetDecimals(token: TokenIdentifier): Promise<number> {
    return this.getAssetDecimalsImpl(token);
  }

  /**
   * Internal implementation for getting asset decimals
   * Must be implemented by subclasses to handle chain-specific logic
   *
   * Implementation guidelines:
   * - Native assets: Return hardcoded decimals (ETH=18, SOL=9, TON=9, etc.)
   * - Tokens: Query from blockchain contracts with appropriate caching
   * - Default to a sensible value if decimals cannot be determined
   */
  protected abstract getAssetDecimalsImpl(token: TokenIdentifier): Promise<number>;
}
