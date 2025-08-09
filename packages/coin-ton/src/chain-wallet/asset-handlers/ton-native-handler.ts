import BigNumber from 'bignumber.js';
import { Address, toNano, internal, SendMode } from '@ton/ton';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { BaseAssetHandler } from './base-asset-handler';
import { TON_CONFIG } from '../config';
import { base } from '@delandlabs/crypto-lib';

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
export class TonNativeHandler extends BaseAssetHandler {
  /**
   * Get native TON balance in nanotons (smallest unit)
   * Note: Address validation is handled at wallet level
   */
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const tonAddress = Address.parse(params.address);
    const balance = await this.client.getBalance(tonAddress);
    // Return balance in nanotons (smallest unit)
    return new BigNumber(balance.toString());
  }

  /**
   * Transfer native TON
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in nanotons (smallest unit)
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, payload } = params;

    // Get initial sequence number
    const seqno = await this.getCurrentSeqno();

    // Amount is already in nanotons, convert to bigint for TON SDK
    const nanotonAmount = BigInt(amount.integerValue(BigNumber.ROUND_FLOOR).toString());

    // Prepare transaction
    const transfer = this.wallet.createTransfer({
      secretKey: this.keyPair.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [
        internal({
          value: nanotonAmount,
          to: Address.parse(recipientAddress),
          bounce: this.getAddressBounceable(recipientAddress),
          body: payload || ''
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
   * Estimate native transfer fee in nanotons (smallest unit)
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in nanotons (smallest unit)
   */
  async estimateFee(params: TransferParams): Promise<BigNumber> {
    const ownerAddress = this.getWalletAddress();

    // Amount is already in nanotons, convert to bigint for TON SDK
    const nanotonAmount = BigInt(params.amount.integerValue(BigNumber.ROUND_FLOOR).toString());

    const messageBody = internal({
      value: nanotonAmount,
      to: Address.parse(params.recipientAddress),
      bounce: this.getAddressBounceable(params.recipientAddress)
    }).body;

    const feeEstimate = (await this.client.estimateExternalMessageFee(Address.parse(ownerAddress), {
      body: messageBody,
      initCode: null,
      initData: null,
      ignoreSignature: true
    } as any)) as any;

    if (!feeEstimate || !feeEstimate.source_fees) {
      // Return default fee in nanotons if estimation fails
      return new BigNumber(toNano(TON_CONFIG.NATIVE_TRANSFER_GAS_AMOUNT.toString()).toString());
    }

    // Calculate total fee from all components (already in nanotons)
    const totalFeeNano =
      (feeEstimate.source_fees.fwd_fee || 0) +
      (feeEstimate.source_fees.in_fwd_fee || 0) +
      (feeEstimate.source_fees.storage_fee || 0) +
      (feeEstimate.source_fees.gas_fee || 0);

    return new BigNumber(totalFeeNano.toString());
  }

  getAssetType(): ChainAssetType {
    return ChainAssetType.Native;
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

    throw new Error(`${TON_CONFIG.CHAIN_NAME}: Transaction confirmation timeout`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get current sequence number (no caching - must be fresh for each transaction)
   */
  private async getCurrentSeqno(): Promise<number> {
    const openedWallet = this.client.open(this.wallet);
    return (await openedWallet.getSeqno()) || 0;
  }

  /**
   * Get address bounceable status
   */
  private getAddressBounceable(address: string): boolean {
    return Address.isFriendly(address) ? Address.parseFriendly(address).isBounceable : false;
  }
}
