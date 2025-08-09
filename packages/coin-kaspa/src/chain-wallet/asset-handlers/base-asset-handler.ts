import BigNumber from 'bignumber.js';
import { ILogger, BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { RpcClient, Krc20RpcClient, Keypair, NetworkId } from '@kcoin/kaspa-web3.js';

/**
 * Abstract base class for Kaspa asset handlers.
 *
 * Each asset type (Native KAS, KRC20 tokens) should extend this class
 * to provide specific implementation for balance queries, transfers, and fee estimation.
 *
 * This follows the Strategy pattern to separate concerns and make the codebase
 * more maintainable and extensible.
 *
 * Note: Address validation is handled at wallet level using ChainValidation,
 * not at handler level, since Kaspa uses the same address format for all assets.
 */
export abstract class BaseAssetHandler {
  constructor(
    protected readonly rpcClient: RpcClient,
    protected readonly krc20RpcClient: Krc20RpcClient | null,
    protected readonly keyPair: Keypair,
    protected readonly networkId: NetworkId,
    protected readonly logger: ILogger
  ) {}

  /**
   * Query balance for the specified asset
   * @param params - Balance query parameters including address and token info
   * @returns Promise resolving to the balance amount
   */
  abstract balanceOf(params: BalanceQueryParams): Promise<BigNumber>;

  /**
   * Execute transfer for the specified asset
   * @param params - Transfer parameters including recipient, amount, and token info
   * @returns Promise resolving to the transaction ID
   */
  abstract transfer(params: TransferParams): Promise<string>;

  /**
   * Estimate transaction fee for the specified asset
   * @param params - Transfer parameters to estimate fee for
   * @returns Promise resolving to the estimated fee amount
   */
  abstract estimateFee(params: TransferParams): Promise<BigNumber>;

  /**
   * Get the asset type this handler supports
   * @returns The ChainAssetType this handler is responsible for
   */
  abstract getAssetType(): ChainAssetType;

  /**
   * Get the current wallet address
   * @returns The wallet address string
   */
  getWalletAddress(): string {
    return this.keyPair.toAddress(this.networkId.networkType).toString();
  }

  /**
   * Clean up resources and references
   * Called when the wallet is being destroyed
   */
  cleanup(): void {
    // Default implementation - handlers can override if needed
  }
}
