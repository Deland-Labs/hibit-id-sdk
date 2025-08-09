import BigNumber from 'bignumber.js';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { ILogger, BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { BaseAssetHandler } from './base-asset-handler';
import { ConnectionManager } from '../shared/connection-manager';
import {
  CHAIN_CONFIG,
  TronRetry,
  CacheTokenInfo,
  MemoizeTokenDecimals,
  CacheAccountResources
} from '../config';

/**
 * Handler for TRC20 token operations.
 *
 * Implements all operations specific to TRC20 tokens:
 * - Token balance queries
 * - Token transfers with energy/bandwidth estimation
 * - Contract interaction and validation
 * - Fee estimation for token operations
 */
export class Trc20TokenHandler extends BaseAssetHandler {
  constructor(connectionManager: ConnectionManager, logger: ILogger) {
    super(connectionManager, logger);
  }

  // ============================================================
  // Public Methods (BaseAssetHandler implementations)
  // ============================================================

  /**
   * Get TRC20 token balance in smallest unit
   * Note: Address and token validation is handled at wallet level
   */
  @TronRetry({})
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const { address, token } = params;

    // Token address validation is handled at wallet level

    // Get contract instance
    const contract = await this.getContractInstance(token.tokenAddress!);

    // Call balanceOf function
    const balance = await contract.balanceOf(address).call();

    // Return balance in smallest unit (no conversion)
    return new BigNumber(balance.toString());
  }

  /**
   * Transfer TRC20 tokens
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in smallest unit
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, token } = params;

    // Token address validation is handled at wallet level

    const walletInfo = this.connectionManager.getWallet();

    // Get cached contract instance
    const contract = await this.getContractInstance(token.tokenAddress!);

    // Amount is already in smallest unit
    const amountInSmallestUnit = amount.integerValue(BigNumber.ROUND_FLOOR);

    // Create transfer transaction
    const transaction = await contract.transfer(recipientAddress, amountInSmallestUnit.toString()).send({
      feeLimit: CHAIN_CONFIG.TRC20_FEE_LIMIT,
      from: walletInfo.address
    });

    return transaction;
  }

  /**
   * Estimate fee for TRC20 token transfer in sun (smallest unit)
   * Note: Address, amount and token validation is handled at wallet level
   */
  @TronRetry({})
  async estimateFee(params: TransferParams): Promise<BigNumber> {
    // Token address validation is handled at wallet level
    // Note: params are validated at wallet level, so we only need wallet info for fee calculation
    void params; // Suppress unused parameter warning

    const walletInfo = this.connectionManager.getWallet();

    // Get cached account resources
    const accountResources = await this.getAccountResources(walletInfo.address);

    // Calculate TRC20 transfer fee based on energy and bandwidth requirements
    return this.calculateTrc20TransferFee(accountResources);
  }

  /**
   * Get the asset type this handler manages
   */
  getAssetType(): ChainAssetType {
    return ChainAssetType.TRC20;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // No specific cleanup needed for TRC20 handler
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Get token decimals with caching and retry
   * @private
   */
  @TronRetry({})
  @MemoizeTokenDecimals
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    const tronWeb = this.connectionManager.getTronWeb();
    const contract = await tronWeb.contract().at(tokenAddress);
    const decimals = await contract.decimals().call();
    return parseInt(decimals.toString(), 10);
  }

  /**
   * Get TRC20 contract instance with caching and retry
   * @private
   */
  @CacheTokenInfo
  @TronRetry({})
  private async getContractInstance(tokenAddress: string): Promise<any> {
    const tronWeb = this.connectionManager.getTronWeb();
    return await tronWeb.contract().at(tokenAddress);
  }

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
   * Get decimals for TRC20 token
   * @param tokenAddress - The TRC20 contract address
   * @returns Promise resolving to the number of decimals
   */
  async getDecimals(tokenAddress?: string): Promise<number> {
    // Validation is handled at wallet level
    return await this.getTokenDecimals(tokenAddress!);
  }

  /**
   * Calculate TRC20 transfer fee in sun (smallest unit)
   * @private
   */
  private calculateTrc20TransferFee(accountResources: any): BigNumber {
    // TRC20 transfers require energy and bandwidth
    const availableEnergy = (accountResources.EnergyLimit || 0) - (accountResources.EnergyUsed || 0);
    const availableBandwidth = (accountResources.freeNetLimit || 0) - (accountResources.freeNetUsed || 0);

    let totalFee = new BigNumber(0);

    // Calculate energy fee
    if (availableEnergy < CHAIN_CONFIG.TRC20_TRANSFER_ENERGY) {
      const neededEnergy = CHAIN_CONFIG.TRC20_TRANSFER_ENERGY - availableEnergy;
      const energyFeeInSun = neededEnergy * CHAIN_CONFIG.ENERGY_PRICE;
      totalFee = totalFee.plus(energyFeeInSun);
    }

    // Calculate bandwidth fee
    if (availableBandwidth < CHAIN_CONFIG.TRC20_TRANSFER_BANDWIDTH) {
      const neededBandwidth = CHAIN_CONFIG.TRC20_TRANSFER_BANDWIDTH - availableBandwidth;
      const bandwidthFeeInSun = neededBandwidth * CHAIN_CONFIG.BANDWIDTH_PRICE;
      totalFee = totalFee.plus(bandwidthFeeInSun);
    }

    // Return fee in sun (smallest unit)
    return totalFee;
  }
}
