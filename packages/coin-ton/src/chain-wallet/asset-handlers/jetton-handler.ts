import BigNumber from 'bignumber.js';
import { Address, toNano, internal, SendMode, JettonMaster, JettonWallet, beginCell } from '@ton/ton';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import {
  BalanceQueryParams,
  TransferParams,
  TransactionError,
  BalanceQueryError,
  HibitIdSdkErrorCode,
  Memoize
} from '@delandlabs/coin-base';
import { BaseAssetHandler } from './base-asset-handler';
import { TON_CONFIG, TonRetry, TON_CACHE_CONFIG } from '../config';
import { base } from '@delandlabs/crypto-lib';

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
export class JettonHandler extends BaseAssetHandler {
  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Get Jetton balance in smallest unit
   * Note: Address and token validation is handled at wallet level
   */
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    if (!params.token?.tokenAddress) {
      throw new BalanceQueryError(
        HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER,
        `${TON_CONFIG.CHAIN_NAME}: Token address is required for Jetton balance query`
      );
    }

    const jettonWallet = await this.getJettonWallet(params.address, params.token.tokenAddress);
    const balance = await jettonWallet.getBalance();

    // Return balance in smallest unit (no conversion)
    return new BigNumber(balance.toString());
  }

  /**
   * Transfer Jetton tokens
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in smallest unit
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, token } = params;

    if (!token?.tokenAddress) {
      throw new TransactionError(
        HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER,
        `${TON_CONFIG.CHAIN_NAME}: Token address is required for Jetton transfer`
      );
    }

    const ownerAddress = this.getWalletAddress();

    // Check gas balance (gas balance is in nanotons)
    const gasBalance = await this.queryNativeBalanceRaw(ownerAddress);
    const gasAmount = new BigNumber(gasBalance.toString());
    const minimumGasNano = toNano(TON_CONFIG.JETTON_TRANSFER_AMOUNT.plus(TON_CONFIG.JETTON_FORWARD_AMOUNT).toString());

    if (gasAmount.lt(minimumGasNano.toString())) {
      throw new TransactionError(
        HibitIdSdkErrorCode.INSUFFICIENT_BALANCE,
        `${TON_CONFIG.CHAIN_NAME}: Insufficient TON balance for gas. Required: ${minimumGasNano.toString()} nanotons, Available: ${gasAmount.toString()} nanotons`
      );
    }

    // Amount is already in smallest unit
    const jettonAmount = amount.integerValue(BigNumber.ROUND_FLOOR);

    if (!jettonAmount.isInteger() || jettonAmount.lt(0)) {
      throw new TransactionError(HibitIdSdkErrorCode.INVALID_AMOUNT, `${TON_CONFIG.CHAIN_NAME}: Invalid Jetton amount`);
    }

    // Get initial sequence number
    const seqno = await this.getCurrentSeqno();

    // Get Jetton wallet
    const jettonWallet = await this.getJettonWallet(ownerAddress, token.tokenAddress);

    // Create transfer message
    const jettonTransfer = beginCell()
      .storeUint(0xf8a7ea5, 32) // transfer op
      .storeUint(0, 64) // query_id
      .storeCoins(BigInt(jettonAmount.toString()))
      .storeAddress(Address.parse(recipientAddress))
      .storeAddress(Address.parse(recipientAddress)) // response_destination
      .storeDict(null) // custom_payload
      .storeCoins(toNano(TON_CONFIG.JETTON_FORWARD_AMOUNT.toString()))
      .storeBit(false) // forward_payload in this cell, not separate cell
      .endCell();

    // Create wallet transfer
    const transfer = this.wallet.createTransfer({
      secretKey: this.keyPair.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [
        internal({
          value: toNano(TON_CONFIG.JETTON_TRANSFER_AMOUNT.toString()),
          to: jettonWallet.address,
          bounce: true,
          body: jettonTransfer
        })
      ]
    });

    // Send transaction
    const openedWallet = this.client.open(this.wallet);
    await openedWallet.send(transfer);

    // Calculate transaction hash
    const hash = base.toHex(transfer.hash());

    return hash;
  }

  /**
   * Estimate Jetton transfer fee in nanotons (smallest unit)
   * Note: Address, amount and token validation is handled at wallet level
   */
  async estimateFee(_params: TransferParams): Promise<BigNumber> {
    // Jetton transfers have predictable gas costs, return in nanotons
    const feeInTon = TON_CONFIG.JETTON_TRANSFER_AMOUNT.plus(TON_CONFIG.JETTON_FORWARD_AMOUNT);
    return new BigNumber(toNano(feeInTon.toString()).toString());
  }

  getAssetType(): ChainAssetType {
    return ChainAssetType.Jetton;
  }

  // ============================================================================
  // Protected Methods
  // ============================================================================

  /**
   * Wait for transaction confirmation
   * This is a utility method that can be used when confirmation is needed
   */
  protected async waitForConfirmation(initialSeqno: number): Promise<void> {
    const maxAttempts = TON_CONFIG.CONFIRMATION_TIMEOUT_MS / TON_CONFIG.CONFIRMATION_CHECK_INTERVAL_MS;

    for (let i = 0; i < maxAttempts; i++) {
      const openedWallet = this.client.open(this.wallet);
      const currentSeqno = (await openedWallet.getSeqno()) || 0;
      if (currentSeqno !== initialSeqno) {
        return;
      }

      if (i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, TON_CONFIG.CONFIRMATION_CHECK_INTERVAL_MS));
      }
    }

    throw new TransactionError(
      HibitIdSdkErrorCode.TRANSACTION_TIMEOUT,
      `${TON_CONFIG.CHAIN_NAME}: Transaction confirmation timeout`
    );
  }

  /**
   * Get decimals for Jetton token
   * @param tokenAddress - The Jetton master contract address
   * @returns Promise resolving to the number of decimals
   */
  async getDecimals(tokenAddress?: string): Promise<number> {
    // Validation is handled at wallet level
    return await this.getJettonDecimals(tokenAddress!);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get Jetton decimals with retry and caching
   * Using separate decorators for better maintainability
   */
  @TonRetry({})
  @Memoize({
    ttl: TON_CACHE_CONFIG.JETTON_DECIMALS.ttl,
    max: TON_CACHE_CONFIG.JETTON_DECIMALS.max,
    key: (jettonMasterAddress: string) => TON_CACHE_CONFIG.JETTON_DECIMALS.key(jettonMasterAddress),
    logger: function (this: JettonHandler) {
      return this.logger;
    }
  })
  private async getJettonDecimals(jettonMasterAddress: string): Promise<number> {
    const jettonMaster = this.client.open(JettonMaster.create(Address.parse(jettonMasterAddress)));
    const jettonData = await jettonMaster.getJettonData();
    const content = jettonData.content as any;
    const decimals = content?.decimals;

    if (typeof decimals === 'number' && decimals >= 0 && decimals <= 255) {
      return decimals;
    }

    this.logger.warn('Invalid or missing decimals, using default', {
      context: 'JettonHandler.getJettonDecimals',
      data: {
        jettonMasterAddress,
        receivedDecimals: decimals
      }
    });
    return TON_CONFIG.DEFAULT_JETTON_DECIMALS;
  }

  /**
   * Get Jetton wallet contract with caching
   */
  @Memoize({
    ttl: TON_CACHE_CONFIG.JETTON_WALLET.ttl,
    max: TON_CACHE_CONFIG.JETTON_WALLET.max,
    key: (ownerAddress: string, contractAddress: string) =>
      TON_CACHE_CONFIG.JETTON_WALLET.key(ownerAddress, contractAddress),
    logger: function (this: JettonHandler) {
      return this.logger;
    }
  })
  private async getJettonWallet(ownerAddress: string, contractAddress: string) {
    const jettonMaster = this.client.open(JettonMaster.create(Address.parse(contractAddress)));
    const jettonWalletAddress = await jettonMaster.getWalletAddress(Address.parse(ownerAddress));
    const jettonWallet = this.client.open(JettonWallet.create(jettonWalletAddress));
    return jettonWallet;
  }

  /**
   * Query raw native balance for gas checks (no caching for balance queries)
   */
  private async queryNativeBalanceRaw(address: string): Promise<BigInt> {
    const tonAddress = Address.parse(address);
    return await this.client.getBalance(tonAddress);
  }

  /**
   * Get current sequence number (no caching - must be fresh for each transaction)
   */
  private async getCurrentSeqno(): Promise<number> {
    const openedWallet = this.client.open(this.wallet);
    return (await openedWallet.getSeqno()) || 0;
  }
}
