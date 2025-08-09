import BigNumber from 'bignumber.js';
import { BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { base } from '@delandlabs/crypto-lib';
import { Address, SendKasParams, Fees } from '@kcoin/kaspa-web3.js';
import { BaseAssetHandler } from './base-asset-handler';
import { TransactionHelper } from '../utils';
import { KaspaRetry } from '../config';

const DEFAULT_FEES = new Fees(0n);

/**
 * Handler for native KAS asset operations.
 *
 * Implements all operations specific to native KAS currency:
 * - Balance queries
 * - Transfers with optional payload
 * - Fee estimation
 */
export class KasNativeHandler extends BaseAssetHandler {
  /**
   * Get native KAS balance in sompi (smallest unit)
   * Note: Address validation is handled at wallet level
   */
  @KaspaRetry({})
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const { address } = params;

    // Address validation is handled at wallet level for all assets
    const res = await this.rpcClient.getBalanceByAddress(address);

    // Return balance in sompi (smallest unit)
    const balance = new BigNumber(res.balance);

    return balance;
  }

  /**
   * Transfer native KAS tokens
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in sompi (smallest unit)
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, payload } = params;

    // Common validation (address, amount) is handled at wallet level
    // Amount is already in sompi (smallest unit)
    const amountInSompi = BigInt(amount.integerValue(BigNumber.ROUND_FLOOR).toString());

    const sendParam = new SendKasParams(
      this.keyPair.toAddress(this.networkId.networkType),
      amountInSompi,
      Address.fromString(recipientAddress),
      this.networkId,
      DEFAULT_FEES,
      payload ? base.toUtf8(payload) : undefined
    );

    const {
      result: { transactions, summary }
    } = await this.createTransactionsByOutputs(sendParam);

    await TransactionHelper.submitTransactions(transactions, this.keyPair, async (reqMessage) => {
      return await this.rpcClient.submitTransaction({
        transaction: reqMessage,
        allowOrphan: false
      });
    });

    const txHash = summary.finalTransactionId?.toString() ?? '';
    return txHash;
  }

  /**
   * Estimate fee for native KAS transfer in sompi (smallest unit)
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in sompi (smallest unit)
   */
  @KaspaRetry({})
  async estimateFee(params: TransferParams): Promise<BigNumber> {
    const { recipientAddress, amount } = params;

    // Common validation (address, amount) is handled at wallet level
    // Amount is already in sompi (smallest unit)
    const amountInSompi = BigInt(amount.integerValue(BigNumber.ROUND_FLOOR).toString());

    const sendKasParam = new SendKasParams(
      this.keyPair.toAddress(this.networkId.networkType),
      amountInSompi,
      Address.fromString(recipientAddress),
      this.networkId,
      DEFAULT_FEES
    );

    const { priorityFee } = await this.createTransactionsByOutputs(sendKasParam);

    // Return fee in sompi (smallest unit)
    const fee = new BigNumber(priorityFee.amount.toString());

    return fee;
  }

  getAssetType(): ChainAssetType {
    return ChainAssetType.Native;
  }

  /**
   * Get decimals for KAS token
   * @returns Promise resolving to the number of decimals (always 8 for KAS)
   */
  async getDecimals(): Promise<number> {
    // KAS always has 8 decimals (1 KAS = 10^8 sompi)
    return 8;
  }

  /**
   * Create transactions by outputs with fee calculation
   * @private
   */
  private async createTransactionsByOutputs(sendParam: SendKasParams): Promise<{
    priorityFee: Fees;
    result: ReturnType<typeof TransactionHelper.createTransactions>;
  }> {
    const { entries: utxos } = await this.rpcClient.getUtxosByAddresses([sendParam.sender.toString()]);

    this.logger.debug('Retrieved UTXOs for transaction creation', {
      context: 'KasNativeHandler.createTransactionsByOutputs',
      data: {
        utxoCount: utxos.length,
        senderAddress: sendParam.sender.toString()
      }
    });

    const settings = sendParam.toGeneratorSettings(utxos);
    const txResult = TransactionHelper.createTransactions(settings);

    if (sendParam.priorityFee?.amount) {
      return {
        priorityFee: sendParam.priorityFee,
        result: txResult
      };
    }

    // Calculate fee if not set
    const res = await this.rpcClient.getFeeEstimate();
    const mass = txResult.transactions[txResult.transactions.length - 1].tx.mass;
    const sompiFee = new BigNumber(mass.toString()).times(res.estimate?.priorityBucket?.feerate ?? 1).toFixed(0);
    const txResultWithFee = TransactionHelper.createTransactions(settings.setPriorityFee(new Fees(BigInt(sompiFee))));

    this.logger.debug('Transaction created with calculated fee', {
      context: 'KasNativeHandler.createTransactionsByOutputs',
      data: {
        mass: mass.toString(),
        feerate: res.estimate?.priorityBucket?.feerate,
        sompiFee
      }
    });

    return {
      priorityFee: new Fees(BigInt(sompiFee)),
      result: txResultWithFee
    };
  }
}
