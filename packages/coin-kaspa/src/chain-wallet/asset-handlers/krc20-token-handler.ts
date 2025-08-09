import BigNumber from 'bignumber.js';
import {
  BalanceQueryParams,
  TransferParams,
  BalanceQueryError,
  TransactionError,
  HibitIdSdkErrorCode
} from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { Krc20TransferOptions, Krc20TransferParams, Fees, Hash } from '@kcoin/kaspa-web3.js';
import { BaseAssetHandler } from './base-asset-handler';
import { TransactionHelper } from '../utils';
import { CHAIN_NAME, KASPA_CONFIG, KaspaRetry } from '../config';

const DEFAULT_FEES = new Fees(0n);

/**
 * Handler for KRC20 token operations on Kaspa blockchain.
 *
 * Implements all operations specific to KRC20 tokens:
 * - Token balance queries
 * - Token transfers using commit/reveal pattern
 * - Fee estimation for token transfers
 * - Token metadata queries (decimals)
 */
export class Krc20TokenHandler extends BaseAssetHandler {
  /**
   * Get KRC20 token balance in smallest unit
   * Note: Address and token validation is handled at wallet level
   */
  @KaspaRetry({})
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const { address, token } = params;

    // Address validation is handled at wallet level for all assets

    // Token address validation is handled at wallet level

    if (!this.krc20RpcClient) {
      throw new BalanceQueryError(
        HibitIdSdkErrorCode.BALANCE_QUERY_FAILED,
        `${CHAIN_NAME}: KRC20 RPC client not initialized`
      );
    }

    const tick = token.tokenAddress!;
    const tickUpper = tick.toUpperCase();

    const res = await this.krc20RpcClient.getKrc20Balance(address, tick);
    if (res.message !== 'successful' || !res.result) {
      throw new BalanceQueryError(HibitIdSdkErrorCode.BALANCE_QUERY_FAILED, `${CHAIN_NAME}: getKrc20Balance failed`);
    }

    for (const balanceInfo of res.result) {
      if (balanceInfo.tick.toUpperCase() === tickUpper) {
        // Return balance in smallest unit (no conversion)
        const balance = new BigNumber(balanceInfo.balance);
        return balance;
      }
    }

    throw new BalanceQueryError(
      HibitIdSdkErrorCode.BALANCE_QUERY_FAILED,
      `${CHAIN_NAME}: KRC20 balance not found for tick ${tickUpper}`
    );
  }

  /**
   * Transfer KRC20 tokens using commit/reveal pattern
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in smallest unit
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, token } = params;

    // Common validation (address, amount) is handled at wallet level

    // Token address validation is handled at wallet level

    // Amount is already in smallest unit
    const amountInSmallestUnit = BigInt(amount.integerValue(BigNumber.ROUND_FLOOR).toString());

    const transferOptions: Krc20TransferOptions = {
      tick: token.tokenAddress,
      to: recipientAddress,
      amount: amountInSmallestUnit
    };

    const krc20TransferParams = new Krc20TransferParams(
      this.keyPair.toAddress(this.networkId.networkType),
      this.networkId,
      DEFAULT_FEES,
      transferOptions,
      DEFAULT_FEES,
      KASPA_CONFIG.AMOUNT_FOR_INSCRIBE
    );

    // Execute commit transaction
    const commitTxId = await this.processKrc20CommitTransaction(krc20TransferParams);

    // Execute reveal transaction
    const revealTxId = await this.processKrc20RevealTransaction(krc20TransferParams, commitTxId);

    return revealTxId;
  }

  /**
   * Estimate fee for KRC20 token transfer in sompi (smallest unit)
   * Note: Address, amount and token validation is handled at wallet level
   * Note: Amount is expected in smallest unit
   */
  @KaspaRetry({})
  async estimateFee(params: TransferParams): Promise<BigNumber> {
    const { recipientAddress, amount, token } = params;

    // Common validation (address, amount) is handled at wallet level

    // Token address validation is handled at wallet level

    // Amount is already in smallest unit
    const amountInSmallestUnit = BigInt(amount.integerValue(BigNumber.ROUND_FLOOR).toString());

    const transferOptions: Krc20TransferOptions = {
      tick: token.tokenAddress,
      to: recipientAddress,
      amount: amountInSmallestUnit
    };

    const krc20TransferParams = new Krc20TransferParams(
      this.keyPair.toAddress(this.networkId.networkType),
      this.networkId,
      DEFAULT_FEES,
      transferOptions,
      DEFAULT_FEES,
      KASPA_CONFIG.AMOUNT_FOR_INSCRIBE
    );

    const { priorityFee } = await this.createTransactionsByOutputs(krc20TransferParams);

    // Return fee in sompi (smallest unit)
    const fee = new BigNumber(priorityFee.amount.toString());

    return fee;
  }

  getAssetType(): ChainAssetType {
    return ChainAssetType.KRC20;
  }

  /**
   * Get decimals for KRC20 token
   * @param tokenAddress - The token tick symbol
   * @returns Promise resolving to the number of decimals
   */
  async getDecimals(tokenAddress?: string): Promise<number> {
    // Validation is handled at wallet level
    return await this.getKrc20Decimals(tokenAddress!);
  }

  /**
   * Get decimals for a KRC20 token
   * @private
   * @param tick - The token tick symbol
   * @returns Number of decimals
   */
  @KaspaRetry({})
  private async getKrc20Decimals(tick: string): Promise<number> {
    if (!this.krc20RpcClient) {
      throw new TransactionError(
        HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER,
        `${CHAIN_NAME}: KRC20 RPC client not initialized`
      );
    }

    const res = await this.krc20RpcClient.getKrc20TokenInfo(tick);
    if (res.message !== 'successful' || !res.result || res.result.length === 0) {
      throw new TransactionError(
        HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER,
        `${CHAIN_NAME}: KRC20 info not found for tick: ${tick}`
      );
    }

    const decimals = Number(res.result[0].dec);
    if (isNaN(decimals)) {
      throw new TransactionError(
        HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER,
        `${CHAIN_NAME}: Invalid decimals for KRC20 tick: ${tick}`
      );
    }

    this.logger.debug('Retrieved KRC20 decimals', {
      context: 'Krc20TokenHandler.getKrc20Decimals',
      data: {
        tick: tick.toUpperCase(),
        decimals
      }
    });

    return decimals;
  }

  /**
   * Process KRC20 commit transaction
   * @private
   */
  private async processKrc20CommitTransaction(krc20TransferParams: Krc20TransferParams): Promise<string> {
    const {
      result: { transactions: commitTxs }
    } = await this.createTransactionsByOutputs(krc20TransferParams);

    const commitTxId = await TransactionHelper.submitTransactions(commitTxs, this.keyPair, async (reqMessage) => {
      return await this.rpcClient.submitTransaction({
        transaction: reqMessage,
        allowOrphan: false
      });
    });

    this.logger.debug('KRC20 commit transaction completed', {
      context: 'Krc20TokenHandler.processKrc20CommitTransaction',
      data: {
        commitTxId
      }
    });

    return commitTxId;
  }

  /**
   * Process KRC20 reveal transaction
   * @private
   */
  private async processKrc20RevealTransaction(
    krc20TransferParams: Krc20TransferParams,
    commitTxId: string
  ): Promise<string> {
    const {
      result: { transactions: revealTxs }
    } = await this.createTransactionsByOutputs(krc20TransferParams, commitTxId);

    const revealTxId = await TransactionHelper.submitKrc20RevealTransactions(
      revealTxs,
      this.keyPair,
      krc20TransferParams,
      async (reqMessage) => {
        this.logger.debug('Submitting KRC20 reveal transaction', {
          context: 'Krc20TokenHandler.processKrc20RevealTransaction'
        });
        return await this.rpcClient.submitTransaction({
          transaction: reqMessage,
          allowOrphan: false
        });
      }
    );

    this.logger.debug('KRC20 reveal transaction completed', {
      context: 'Krc20TokenHandler.processKrc20RevealTransaction',
      data: {
        revealTxId
      }
    });

    return revealTxId;
  }

  /**
   * Create transactions by outputs with fee calculation
   * @private
   */
  private async createTransactionsByOutputs(
    sendParam: Krc20TransferParams,
    commitTxId?: string
  ): Promise<{
    priorityFee: Fees;
    result: ReturnType<typeof TransactionHelper.createTransactions>;
  }> {
    const isReveal = commitTxId !== undefined;

    const { entries: utxos } = await this.rpcClient.getUtxosByAddresses([sendParam.sender.toString()]);

    this.logger.debug('Retrieved UTXOs for transaction creation', {
      context: 'Krc20TokenHandler.createTransactionsByOutputs',
      data: {
        utxoCount: utxos.length,
        senderAddress: sendParam.sender.toString(),
        isReveal
      }
    });

    const settings = !isReveal
      ? sendParam.toCommitTxGeneratorSettings(utxos)
      : sendParam.toRevealTxGeneratorSettings(utxos, Hash.fromHex(commitTxId));

    const txResult = TransactionHelper.createTransactions(settings);

    const priorityFee = isReveal ? sendParam.commitTxPriorityFee : sendParam.revealPriorityFee;

    if (priorityFee?.amount) {
      return {
        priorityFee,
        result: txResult
      };
    }

    // Calculate fee if not set
    const res = await this.rpcClient.getFeeEstimate();
    const mass = txResult.transactions[txResult.transactions.length - 1].tx.mass;
    const sompiFee = new BigNumber(mass.toString()).times(res.estimate?.priorityBucket?.feerate ?? 1).toFixed(0);
    const txResultWithFee = TransactionHelper.createTransactions(settings.setPriorityFee(new Fees(BigInt(sompiFee))));

    this.logger.debug('Transaction created with calculated fee', {
      context: 'Krc20TokenHandler.createTransactionsByOutputs',
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
