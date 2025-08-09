import BigNumber from 'bignumber.js';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { BaseAssetHandler } from './base-asset-handler';
/**
 * Handler for Jetton (TON token standard) operations.
 *
 * Implements all operations specific to Jetton tokens:
 * - Balance queries via Jetton wallet contracts
 * - Token transfers with gas estimation
 * - Decimals fetching and caching
 *
 * Note: Address validation is handled at the wallet level using ChainValidation
 */
export declare class JettonHandler extends BaseAssetHandler {
    /**
     * Get Jetton balance in smallest unit
     * Note: Address and token validation is handled at wallet level
     */
    balanceOf(params: BalanceQueryParams): Promise<BigNumber>;
    /**
     * Transfer Jetton tokens
     * Note: Address, amount and token validation is handled at wallet level
     * Note: Amount is expected in smallest unit
     */
    transfer(params: TransferParams): Promise<string>;
    /**
     * Estimate Jetton transfer fee in nanotons (smallest unit)
     * Note: Address, amount and token validation is handled at wallet level
     */
    estimateFee(_params: TransferParams): Promise<BigNumber>;
    getAssetType(): ChainAssetType;
    /**
     * Wait for transaction confirmation
     * This is a utility method that can be used when confirmation is needed
     */
    protected waitForConfirmation(initialSeqno: number): Promise<void>;
    /**
     * Get decimals for Jetton token
     * @param tokenAddress - The Jetton master contract address
     * @returns Promise resolving to the number of decimals
     */
    getDecimals(tokenAddress?: string): Promise<number>;
    /**
     * Get Jetton decimals with retry and caching
     * Using separate decorators for better maintainability
     */
    private getJettonDecimals;
    /**
     * Get Jetton wallet contract with caching
     */
    private getJettonWallet;
    /**
     * Query raw native balance for gas checks (no caching for balance queries)
     */
    private queryNativeBalanceRaw;
    /**
     * Get current sequence number (no caching - must be fresh for each transaction)
     */
    private getCurrentSeqno;
}
