import BigNumber from 'bignumber.js';
import { ILogger, BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { KeyPair } from '@ton/crypto';

/**
 * Abstract base class for TON asset handlers.
 *
 * Each asset type (Native TON, Jetton tokens, etc.) should extend this class
 * to provide specific implementation for balance queries, transfers, and fee estimation.
 *
 * This follows the Strategy pattern to separate concerns and make the codebase
 * more maintainable and extensible.
 *
 * Note: Address validation is handled at the wallet level using coin-base validators,
 * not in individual handlers, as TON assets share the same address format.
 */
export abstract class BaseAssetHandler {
  constructor(
    protected readonly client: TonClient,
    protected readonly wallet: WalletContractV4,
    protected readonly keyPair: KeyPair,
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
   * Get the wallet address
   * @returns The wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address.toString();
  }

  /**
   * Wait for transaction confirmation
   * @param initialSeqno Initial sequence number
   * @returns Promise that resolves when confirmed
   */
  protected abstract waitForConfirmation(initialSeqno: number): Promise<void>;

  /**
   * Clean up resources and references
   * Called when the wallet is being destroyed
   */
  cleanup(): void {
    // Default implementation - subclasses can override if needed
  }
}
