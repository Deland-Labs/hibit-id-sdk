import BigNumber from 'bignumber.js';
import { Contract } from 'ethers';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import {
  ILogger,
  BalanceQueryParams,
  TransferParams,
  BalanceQueryError,
  HibitIdSdkErrorCode,
  Memoize
} from '@delandlabs/coin-base';
import { BaseAssetHandler } from './base-asset-handler';
import { ConnectionManager } from '../shared/connection-manager';
import { erc20Abi } from '../utils';
import { CHAIN_CONFIG, CACHE_CONFIG, EthereumRetry } from '../config';

/**
 * Handler for ERC20 token operations.
 *
 * Implements all operations specific to ERC20 tokens:
 * - Token balance queries with decimals handling
 * - ERC20 transfer transactions
 * - Gas estimation for token transfers
 * - Token contract validation
 */
export class Erc20TokenHandler extends BaseAssetHandler {
  constructor(connectionManager: ConnectionManager, logger: ILogger) {
    super(connectionManager, logger);
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Get ERC20 token balance in smallest unit
   * Note: Address and token validation is handled at wallet level
   * Note: Balance queries should NOT have retry decorators per requirements
   */
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    // Address and token validation is handled at wallet level

    // Query balance
    const provider = this.connectionManager.getProvider();
    const contract = new Contract(params.token.tokenAddress!, erc20Abi, provider);
    const balance = await contract.balanceOf(params.address);

    // Return balance in smallest unit
    return new BigNumber(balance.toString());
  }

  /**
   * Transfer ERC20 tokens
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in smallest unit
   * Note: Transaction submissions should NOT have retry decorators per requirements
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, token } = params;

    // Address, amount and token validation is handled at wallet level

    const provider = this.connectionManager.getProvider();
    const wallet = this.connectionManager.getConnectedWallet(provider);
    const walletAddress = wallet.address;

    // Create contract instance connected to wallet
    const contract = new Contract(token.tokenAddress!, erc20Abi, wallet);

    // Get current nonce
    const nonce = await this.getWalletNonce();

    // Prepare transaction options
    const txOptions = {
      nonce
    };

    // Send transfer transaction (amount is already in smallest unit)
    const txResponse = await contract.transfer(recipientAddress, BigInt(amount.toFixed(0)), txOptions);

    this.logger.info('ERC20 transfer sent', {
      context: 'Erc20TokenHandler.transfer',
      data: {
        hash: txResponse.hash,
        from: walletAddress,
        to: recipientAddress,
        amountSmallestUnit: amount.toString(),
        token: token.tokenAddress
      }
    });

    return txResponse.hash;
  }

  /**
   * Estimate gas fee for ERC20 transfer in wei
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in smallest unit
   */
  @EthereumRetry()
  async estimateFee(params: TransferParams): Promise<BigNumber> {
    const { recipientAddress, amount, token } = params;

    // Address, amount and token validation is handled at wallet level

    const provider = this.connectionManager.getProvider();
    const wallet = this.connectionManager.getConnectedWallet(provider);

    // Get gas price from cache or network
    const gasPrice = await this.getGasPrice();

    // Create contract instance
    const contract = new Contract(token.tokenAddress!, erc20Abi, wallet);

    // Estimate gas limit for transfer (amount is already in smallest unit)
    const gasLimit = await contract.transfer.estimateGas(recipientAddress, BigInt(amount.toFixed(0)));

    // Calculate total fee in wei
    const fee = gasPrice * gasLimit;
    return new BigNumber(fee.toString());
  }

  /**
   * Get the asset type this handler manages
   */
  getAssetType(): ChainAssetType {
    return ChainAssetType.ERC20;
  }

  /**
   * Clean up resources and references
   * Called when the wallet is being destroyed
   */
  cleanup(): void {
    // ERC20 handler doesn't maintain internal state that needs cleanup
    // The connectionManager is managed by the parent wallet
    this.logger.debug('ERC20 token handler cleanup completed', {
      context: 'Erc20TokenHandler.cleanup'
    });
  }

  /**
   * Get decimals for ERC20 token
   * @param tokenAddress - The token contract address
   * @returns Promise resolving to the number of decimals
   */
  async getDecimals(tokenAddress?: string): Promise<number> {
    // Validation is handled at wallet level
    return await this.getTokenDecimals(tokenAddress!);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get token decimals with caching
   * Note: Keep try-catch for business logic validation of ERC20 contract
   * @private
   */
  @EthereumRetry()
  @Memoize({
    ttl: CACHE_CONFIG.TTL.DECIMALS,
    max: CACHE_CONFIG.SIZE.DECIMALS,
    key: (tokenAddress: string) => `decimals:${tokenAddress}`
  })
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      const provider = this.connectionManager.getProvider();
      const contract = new Contract(tokenAddress, erc20Abi, provider);
      const decimals = await contract.decimals();
      return Number(decimals);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('call revert') || errorMessage.includes('execution reverted')) {
        throw new BalanceQueryError(
          HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER,
          `${CHAIN_CONFIG.CHAIN_NAME}: Invalid ERC20 contract at ${tokenAddress} - contract may not exist or does not implement decimals(): ${errorMessage}`
        );
      }

      throw new BalanceQueryError(
        HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER,
        `${CHAIN_CONFIG.CHAIN_NAME}: Failed to fetch decimals for ERC20 token ${tokenAddress}: ${errorMessage}`
      );
    }
  }

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
    key: function (this: Erc20TokenHandler) {
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
