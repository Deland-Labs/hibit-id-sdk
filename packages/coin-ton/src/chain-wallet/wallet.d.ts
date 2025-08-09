import BigNumber from 'bignumber.js';
import { ChainAccount } from '@delandlabs/hibit-basic-types';
import { BaseChainWallet, ChainInfo, BalanceQueryParams, TransferParams, SignMessageParams, TokenIdentifier, ILogger, TransactionConfirmationParams, TransactionConfirmationResult } from '@delandlabs/coin-base';
export interface TonWalletOptions {
    keyDerivationMethod?: 'ton-native' | 'ed25519';
}
/**
 * TON blockchain wallet implementation supporting native TON and Jetton tokens.
 *
 * This refactored implementation uses the Strategy Pattern to handle different
 * asset types (Native TON and Jetton tokens). Each asset type has its own
 * handler that encapsulates the specific logic for that asset type.
 *
 * Key features:
 * - Supports both TON native and Ed25519 key derivation
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
export declare class TonChainWallet extends BaseChainWallet {
    private keyPair;
    private client;
    private wallet;
    private readonly readyPromise;
    private readonly assetHandlers;
    private keyDerivationMethod;
    constructor(chainInfo: ChainInfo, mnemonic: string, options?: TonWalletOptions & {
        logger?: ILogger;
    });
    /**
     * Get wallet account information
     */
    protected getAccountImpl(): Promise<ChainAccount>;
    /**
     * Sign message - implemented directly in wallet (TON native signing)
     */
    protected signMessageImpl(params: SignMessageParams): Promise<Uint8Array>;
    /**
     * Query balance - delegates to appropriate handler
     */
    protected balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber>;
    /**
     * Transfer assets - delegates to appropriate handler
     */
    protected transferImpl(params: TransferParams): Promise<string>;
    /**
     * Estimate transfer fee - delegates to appropriate handler
     */
    protected estimateFeeImpl(params: TransferParams): Promise<BigNumber>;
    /**
     * Clean up wallet resources
     */
    protected destroyImpl(): void;
    /**
     * Initialize the wallet from mnemonic
     * @private
     */
    private initializeWallet;
    /**
     * Derive Ed25519 key pair from mnemonic
     * @private
     */
    private deriveEd25519KeyPair;
    /**
     * Initialize asset handlers after wallet is ready
     * @private
     */
    private initializeAssetHandlers;
    /**
     * Get the appropriate asset handler for the given asset type
     * @private
     */
    private getAssetHandler;
    /**
     * Get RPC endpoint with caching
     * @private
     */
    private getRpcEndpoint;
    /**
     * Check if using testnet
     * @private
     */
    private isTestNetwork;
    /**
     * Get current sequence number
     * @private
     */
    private getCurrentSeqno;
    /**
     * Wait for transaction confirmation
     * TON uses sequence number increment as confirmation mechanism
     */
    protected waitForConfirmationImpl(params: TransactionConfirmationParams): Promise<TransactionConfirmationResult>;
    /**
     * Implementation of getAssetDecimals
     * Returns the number of decimals for the specified asset
     */
    protected getAssetDecimalsImpl(token: TokenIdentifier): Promise<number>;
}
