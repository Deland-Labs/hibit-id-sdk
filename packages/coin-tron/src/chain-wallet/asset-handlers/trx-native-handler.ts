import BigNumber from 'bignumber.js';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { ILogger, BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { BaseAssetHandler } from './base-asset-handler';
import { ConnectionManager } from '../shared/connection-manager';
import { CHAIN_CONFIG, CacheAccountResources, TronRetry } from '../config';

/**
 * Handler for native TRX operations.
 *
 * Implements all operations specific to native TRON currency:
 * - Direct balance queries
 * - Native transfers with bandwidth/energy estimation
 * - Fee estimation based on account resources
 */
export class TrxNativeHandler extends BaseAssetHandler {
  constructor(connectionManager: ConnectionManager, logger: ILogger) {
    super(connectionManager, logger);
  }

  // ============================================================
  // Public Methods (BaseAssetHandler implementations)
  // ============================================================

  /**
   * Get native TRX balance in sun (smallest unit)
   * Note: Address validation is handled at wallet level
   */
  @TronRetry({})
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const { address } = params;
    const tronWeb = this.connectionManager.getTronWeb();

    // Get balance in sun (smallest TRX unit)
    const balanceInSun = await tronWeb.trx.getBalance(address);

    // Return balance in sun (smallest unit)
    return new BigNumber(balanceInSun);
  }

  /**
   * Transfer native TRX
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in sun (smallest unit)
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount } = params;

    const tronWeb = this.connectionManager.getTronWeb();
    const walletInfo = this.connectionManager.getWallet();

    // Amount is already in sun (smallest unit)
    const amountInSun = amount.integerValue(BigNumber.ROUND_FLOOR).toNumber();

    // Create transaction
    const transaction = await tronWeb.transactionBuilder.sendTrx(recipientAddress, amountInSun, walletInfo.address);

    // Sign transaction
    const signedTransaction = await tronWeb.trx.sign(transaction);

    // Broadcast transaction
    const result = await tronWeb.trx.sendRawTransaction(signedTransaction);

    if (!result.result) {
      throw new Error(result.message || 'Transaction failed');
    }

    return result.txid;
  }

  /**
   * Estimate fee for native TRX transfer in sun (smallest unit)
   * Note: Address, amount and token validation is handled at wallet level
   */
  @TronRetry({})
  async estimateFee(_params: TransferParams): Promise<BigNumber> {
    const walletInfo = this.connectionManager.getWallet();

    // Get cached account resources
    const accountResources = await this.getAccountResources(walletInfo.address);

    // Calculate native TRX transfer fee based on bandwidth requirements
    return this.calculateNativeTransferFee(accountResources);
  }

  /**
   * Get the asset type this handler supports
   */
  getAssetType(): ChainAssetType {
    return ChainAssetType.Native;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // No specific cleanup needed for native handler
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Get account resources with caching and retry
   * @private
   */
  @CacheAccountResources
  @TronRetry({})
  private async getAccountResources(address: string): Promise<any> {
    const tronWeb = this.connectionManager.getTronWeb();
    return await tronWeb.trx.getAccountResources(address);
  }

  /**
   * Calculate native TRX transfer fee in sun (smallest unit)
   * @private
   */
  private calculateNativeTransferFee(accountResources: any): BigNumber {
    // TRX transfers typically only require bandwidth
    const bandwidth = accountResources.freeNetUsed || 0;
    const bandwidthLimit = accountResources.freeNetLimit || 0;

    const availableBandwidth = bandwidthLimit - bandwidth;

    if (availableBandwidth >= CHAIN_CONFIG.NATIVE_TRANSFER_BANDWIDTH) {
      // Sufficient bandwidth available - no fee
      return new BigNumber(0);
    } else {
      // Need to burn TRX for bandwidth
      const neededBandwidth = CHAIN_CONFIG.NATIVE_TRANSFER_BANDWIDTH - availableBandwidth;
      const feeInSun = neededBandwidth * CHAIN_CONFIG.BANDWIDTH_PRICE;

      // Return fee in sun (smallest unit)
      return new BigNumber(feeInSun);
    }
  }
}
