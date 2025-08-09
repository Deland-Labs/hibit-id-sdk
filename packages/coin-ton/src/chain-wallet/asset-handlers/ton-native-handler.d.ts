import BigNumber from 'bignumber.js';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { BaseAssetHandler } from './base-asset-handler';
/**
 * Handler for native TON asset operations.
 *
 * Implements all operations specific to native TON currency:
 * - Direct balance queries via TON RPC
 * - Native transfers with gas estimation
 * - Fee estimation
 *
 * Note: Address validation is handled at the wallet level using ChainValidation
 */
export declare class TonNativeHandler extends BaseAssetHandler {
    /**
     * Get native TON balance in nanotons (smallest unit)
     * Note: Address validation is handled at wallet level
     */
    balanceOf(params: BalanceQueryParams): Promise<BigNumber>;
    /**
     * Transfer native TON
     * Note: Address, amount and token validation is handled at wallet level
     * Note: Amount is expected in nanotons (smallest unit)
     */
    transfer(params: TransferParams): Promise<string>;
    /**
     * Estimate native transfer fee in nanotons (smallest unit)
     * Note: Address, amount and token validation is handled at wallet level
     * Note: Amount is expected in nanotons (smallest unit)
     */
    estimateFee(params: TransferParams): Promise<BigNumber>;
    getAssetType(): ChainAssetType;
    /**
     * Wait for transaction confirmation
     * This is a utility method that can be used when confirmation is needed
     */
    protected waitForConfirmation(initialSeqno: number): Promise<void>;
    /**
     * Get current sequence number (no caching - must be fresh for each transaction)
     */
    private getCurrentSeqno;
    /**
     * Get address bounceable status
     */
    private getAddressBounceable;
}
