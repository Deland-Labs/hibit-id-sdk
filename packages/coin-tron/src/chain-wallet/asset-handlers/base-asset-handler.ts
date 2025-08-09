import BigNumber from 'bignumber.js';
import { ILogger, BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { ConnectionManager } from '../shared/connection-manager';

/**
 * Abstract base class for asset handlers in TRON chain wallet.
 *
 * Each asset type (Native TRX, TRC20 tokens, etc.) should extend this class
 * to provide specific implementation for balance queries, transfers, and fee estimation.
 *
 * This follows the Strategy pattern to separate concerns and make the codebase
 * more maintainable and extensible.
 */
export abstract class BaseAssetHandler {
  constructor(
    protected readonly connectionManager: ConnectionManager,
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
   * Clean up resources and references
   * Called when the wallet is being destroyed
   */
  abstract cleanup(): void;
}
