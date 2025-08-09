import BigNumber from 'bignumber.js';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { ILogger, BalanceQueryParams, TransferParams, Memoize } from '@delandlabs/coin-base';
import { BaseAssetHandler } from './base-asset-handler';
import { ConnectionManager } from '../shared/connection-manager';
import { CACHE_CONFIG, EthereumRetry } from '../config';

/**
 * Handler for native Ethereum asset (ETH, BNB, etc.) operations.
 *
 * Implements all operations specific to native blockchain currency:
 * - Direct balance queries
 * - Native transfers with gas estimation
 * - Gas fee estimation with caching
 */
export class EthNativeHandler extends BaseAssetHandler {
  constructor(connectionManager: ConnectionManager, logger: ILogger) {
    super(connectionManager, logger);
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Get native ETH/BNB balance in wei (smallest unit)
   * Note: Address validation is handled at wallet level
   * Note: Balance queries should NOT have retry decorators per requirements
   */
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const provider = this.connectionManager.getProvider();
    const balance = await provider.getBalance(params.address);
    return new BigNumber(balance.toString());
  }

  /**
   * Transfer native ETH/BNB
   * Note: Address and amount validation is handled at wallet level
   * Note: Amount is expected in wei (smallest unit)
   * Note: Transaction submissions should NOT have retry decorators per requirements
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount } = params;

    const provider = this.connectionManager.getProvider();
    const wallet = this.connectionManager.getConnectedWallet(provider);
    const walletAddress = wallet.address;

    // Get current nonce
    const nonce = await this.getWalletNonce();

    // Prepare transaction (amount is already in wei)
    const tx = {
      to: recipientAddress,
      value: BigInt(amount.toFixed(0)),
      nonce
    };

    // Send transaction
    const txResponse = await wallet.sendTransaction(tx);

    this.logger.info('Native transfer sent', {
      context: 'EthNativeHandler.transfer',
      data: {
        hash: txResponse.hash,
        from: walletAddress,
        to: recipientAddress,
        amountWei: amount.toString()
      }
    });

    return txResponse.hash;
  }

  /**
   * Estimate gas fee for native transfer in wei
   * Note: Address and amount validation is handled at wallet level
   * Note: Amount is expected in wei (smallest unit)
   */
  @EthereumRetry()
  async estimateFee(params: TransferParams): Promise<BigNumber> {
    const { recipientAddress, amount } = params;

    const provider = this.connectionManager.getProvider();
    const wallet = this.connectionManager.getConnectedWallet(provider);

    // Get gas price from cache or network
    const gasPrice = await this.getGasPrice();

    // Estimate gas limit (amount is already in wei)
    const gasLimit = await wallet.estimateGas({
      to: recipientAddress,
      value: BigInt(amount.toFixed(0))
    });

    // Calculate total fee in wei
    const fee = gasPrice * gasLimit;
    return new BigNumber(fee.toString());
  }

  /**
   * Get the asset type this handler manages
   */
  getAssetType(): ChainAssetType {
    return ChainAssetType.Native;
  }

  /**
   * Clean up resources and references
   * Called when the wallet is being destroyed
   */
  cleanup(): void {
    // ETH native handler doesn't maintain internal state that needs cleanup
    // The connectionManager is managed by the parent wallet
    this.logger.debug('ETH native handler cleanup completed', {
      context: 'EthNativeHandler.cleanup'
    });
  }

  /**
   * Get decimals for native ETH/BNB
   * @returns Always returns 18 for EVM native assets
   */
  async getDecimals(): Promise<number> {
    return 18;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get wallet nonce (always fresh, not cached)
   * @private
   */
  private async getWalletNonce(): Promise<number> {
    const provider = this.connectionManager.getProvider();
    const wallet = this.connectionManager.getConnectedWallet(provider);
    return await wallet.getNonce();
  }

  /**
   * Get gas price with caching per network
   * @private
   */
  @Memoize({
    ttl: CACHE_CONFIG.TTL.GAS_PRICE,
    max: CACHE_CONFIG.SIZE.GAS_PRICE,
    key: function (this: EthNativeHandler) {
      const provider = this.connectionManager.getProvider();
      const chainId = provider._network?.chainId?.toString() || 'default';
      return `gasPrice:${chainId}`;
    }
  })
  private async getGasPrice(): Promise<bigint> {
    const provider = this.connectionManager.getProvider();
    const feeData = await provider.getFeeData();
    return feeData.gasPrice || 0n;
  }
}
