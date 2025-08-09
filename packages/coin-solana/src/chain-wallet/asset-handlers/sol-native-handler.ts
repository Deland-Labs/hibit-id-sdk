import BigNumber from 'bignumber.js';
import { PublicKey, Transaction, SystemProgram, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { BalanceQueryParams, TransferParams, FeeEstimationError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { base } from '@delandlabs/crypto-lib';
import { BaseAssetHandler } from './base-asset-handler';
import { CHAIN_NAME, MEMO_PROGRAM_ID, SolanaRetry } from '../config';
import { ExtendedTransferParams } from '../shared/connection-manager';

/**
 * Handler for native SOL operations on Solana blockchain.
 *
 * This handler manages operations specific to native SOL including:
 * - Balance queries
 * - Native transfers with memo support
 * - Message signing
 * - Fee estimation with priority fee support
 */
export class SolNativeHandler extends BaseAssetHandler {
  /**
   * Get native SOL balance in lamports (smallest unit)
   */
  @SolanaRetry({})
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const { address } = params;

    const connection = this.connectionManager.getConnection();
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    // Return balance in lamports
    return new BigNumber(balance);
  }

  /**
   * Transfer native SOL
   * Note: Amount is expected in lamports (smallest unit)
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, payload } = params;
    const extendedParams = params as ExtendedTransferParams;

    const wallet = this.connectionManager.getWallet();
    const fromPublicKey = wallet.keypair.publicKey;
    const toPublicKey = new PublicKey(recipientAddress);

    // Amount is already in lamports
    const lamports = amount.integerValue(BigNumber.ROUND_FLOOR);

    const transaction = new Transaction();

    // Add priority fee if specified
    if (extendedParams.priorityFee && extendedParams.priorityFee > 0) {
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: extendedParams.priorityFee
        })
      );
    }

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: lamports.toNumber()
      })
    );

    // Add memo if payload is provided
    if (payload) {
      this.addMemoToTransaction(transaction, payload);
    }

    // Simulate transaction if requested
    if (extendedParams.simulateBeforeSend) {
      await this.connectionManager.simulateTransaction(transaction);
    }

    return await this.connectionManager.sendAndConfirmTransaction(transaction);
  }

  /**
   * Estimate fee for native SOL transfer in lamports
   */
  @SolanaRetry({})
  async estimateFee(params: TransferParams): Promise<BigNumber> {
    const extendedParams = params as ExtendedTransferParams;

    const connection = this.connectionManager.getConnection();

    // Create a dummy transaction for fee calculation
    const dummyTransaction = new Transaction();

    // Add priority fee if specified
    if (extendedParams.priorityFee && extendedParams.priorityFee > 0) {
      dummyTransaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: extendedParams.priorityFee
        })
      );
    }

    // Add a dummy transfer instruction
    dummyTransaction.add(
      SystemProgram.transfer({
        fromPubkey: PublicKey.default,
        toPubkey: PublicKey.default,
        lamports: 1
      })
    );

    const message = dummyTransaction.compileMessage();
    const fee = await connection.getFeeForMessage(message);

    if (fee.value === null) {
      throw new FeeEstimationError(
        HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED,
        `${CHAIN_NAME}: Fee calculation error - fee value is null`
      );
    }

    // Return fee in lamports
    return new BigNumber(fee.value);
  }

  /**
   * Get the asset type this handler supports
   */
  getAssetType(): ChainAssetType {
    return ChainAssetType.Native;
  }

  /**
   * Clean up resources and references
   */
  cleanup(): void {
    // No resources to clean up for native SOL handler
  }

  /**
   * Get decimals for native SOL
   * @returns Always returns 9 for SOL
   */
  async getDecimals(): Promise<number> {
    return 9;
  }

  /**
   * Add memo instruction to transaction
   * @private
   */
  private addMemoToTransaction(transaction: Transaction, memo: string): void {
    const memoProgramId = new PublicKey(MEMO_PROGRAM_ID);
    const memoData = Buffer.from(base.toUtf8(memo));
    const instruction = new TransactionInstruction({
      keys: [],
      programId: memoProgramId,
      data: memoData
    });
    transaction.add(instruction);
  }
}
