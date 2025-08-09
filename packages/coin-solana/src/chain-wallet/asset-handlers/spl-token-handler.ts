import BigNumber from 'bignumber.js';
import { PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import {
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint,
  TokenAccountNotFoundError,
  createTransferInstruction
} from '@solana/spl-token';
import {
  BalanceQueryParams,
  TransferParams,
  FeeEstimationError,
  HibitIdSdkErrorCode,
  Cacheable,
  Memoize
} from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { BaseAssetHandler } from './base-asset-handler';
import { CHAIN_NAME, TOKEN_ACCOUNT_SIZE, CACHE_CONFIG, SolanaRetry } from '../config';
import { ExtendedTransferParams } from '../shared/connection-manager';

/**
 * Handler for SPL token operations on Solana blockchain.
 *
 * This handler manages operations specific to SPL tokens including:
 * - Balance queries with decimal handling
 * - Token transfers with automatic account creation
 * - Fee estimation with account creation costs
 * - Token contract interaction
 */
export class SplTokenHandler extends BaseAssetHandler {
  constructor(connectionManager: any, logger: any) {
    super(connectionManager, logger);
  }

  // ============================================================
  // Public Methods (BaseAssetHandler implementations)
  // ============================================================

  /**
   * Get SPL token balance in smallest unit
   * Note: Address and token validation is handled at wallet level
   */
  @SolanaRetry({})
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const { address, token } = params;

    const connection = this.connectionManager.getConnection();
    const ownerPublicKey = new PublicKey(address);
    const mintPublicKey = new PublicKey(token.tokenAddress!);

    // Get associated token account
    const associatedTokenAddress = await getAssociatedTokenAddress(mintPublicKey, ownerPublicKey);

    try {
      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      // Return balance in smallest unit
      return new BigNumber(tokenAccount.amount.toString());
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        // No token account means 0 balance
        return new BigNumber(0);
      }
      throw error;
    }
  }

  /**
   * Transfer SPL tokens
   * Note: Amount is expected in smallest unit
   * Note: Address and token validation is handled at wallet level
   */
  async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, token, payload } = params;
    const extendedParams = params as ExtendedTransferParams;

    const wallet = this.connectionManager.getWallet();
    const fromPublicKey = wallet.keypair.publicKey;
    const toPublicKey = new PublicKey(recipientAddress);
    const mintPublicKey = new PublicKey(token.tokenAddress!);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
    const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

    // Create transaction
    const transaction = new Transaction();

    // Add priority fee if specified
    if (extendedParams.priorityFee && extendedParams.priorityFee > 0) {
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: extendedParams.priorityFee
        })
      );
    }

    // Ensure recipient has token account
    await this.ensureTokenAccountExists(transaction, toTokenAccount, toPublicKey, mintPublicKey, fromPublicKey);

    // Amount is already in smallest unit
    const tokenAmount = amount.integerValue(BigNumber.ROUND_FLOOR);

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(fromTokenAccount, toTokenAccount, fromPublicKey, BigInt(tokenAmount.toString()))
    );

    // Add memo if payload is provided (handled by connection manager)
    if (payload) {
      // Memo handling would be implemented in a shared utility
      this.logger.debug('Memo support for SPL tokens', {
        context: 'SplTokenHandler.transfer',
        data: { payload }
      });
    }

    // Simulate transaction if requested
    if (extendedParams.simulateBeforeSend) {
      await this.connectionManager.simulateTransaction(transaction);
    }

    return await this.connectionManager.sendAndConfirmTransaction(transaction);
  }

  /**
   * Estimate fee for SPL token transfer in lamports
   * Note: Address and token validation is handled at wallet level
   */
  @SolanaRetry({})
  async estimateFee(params: TransferParams): Promise<BigNumber> {
    const { recipientAddress, token } = params;
    const extendedParams = params as ExtendedTransferParams;

    const connection = this.connectionManager.getConnection();
    const toPublicKey = new PublicKey(recipientAddress);
    const mintPublicKey = new PublicKey(token.tokenAddress!);
    const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

    // Check if we need to create the token account
    let needsAccountCreation = false;
    try {
      await getAccount(connection, toTokenAccount);
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        needsAccountCreation = true;
      }
    }

    // Calculate fee based on whether we need to create account
    const dummyTransaction = new Transaction();

    // Add priority fee if specified
    if (extendedParams.priorityFee && extendedParams.priorityFee > 0) {
      dummyTransaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: extendedParams.priorityFee
        })
      );
    }

    const message = dummyTransaction.compileMessage();
    const fee = await connection.getFeeForMessage(message);

    if (fee.value === null) {
      throw new FeeEstimationError(
        HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED,
        `${CHAIN_NAME}: Fee calculation error - fee value is null`
      );
    }

    // Add account creation rent if needed
    let totalFee = new BigNumber(fee.value);
    if (needsAccountCreation) {
      const rentExemption = await this.getTokenAccountRentExemption();
      totalFee = totalFee.plus(rentExemption);
    }

    // Return fee in lamports
    return totalFee;
  }

  /**
   * Get the asset type this handler supports
   */
  getAssetType(): ChainAssetType {
    return ChainAssetType.SPL;
  }

  /**
   * Clean up resources and references
   */
  cleanup(): void {
    // No resources to clean up for SPL token handler
  }

  /**
   * Get decimals for SPL token
   * @param tokenAddress - The token mint address
   * @returns Promise resolving to the number of decimals
   */
  async getDecimals(tokenAddress?: string): Promise<number> {
    // Validation is handled at wallet level
    const mintPublicKey = new PublicKey(tokenAddress!);
    return await this.getTokenDecimals(mintPublicKey);
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Get SPL token decimals with caching and retry
   */
  @SolanaRetry({})
  @Memoize({
    ttl: CACHE_CONFIG.TTL.TOKEN_DECIMALS,
    max: CACHE_CONFIG.SIZE.TOKEN_DECIMALS,
    key: (mintPublicKey: PublicKey) => CACHE_CONFIG.KEYS.TOKEN_DECIMALS(mintPublicKey.toBase58()),
    logger: function (this: SplTokenHandler) {
      return this.logger;
    }
  })
  private async getTokenDecimals(mintPublicKey: PublicKey): Promise<number> {
    const connection = this.connectionManager.getConnection();
    const mintInfo = await getMint(connection, mintPublicKey);
    return mintInfo.decimals;
  }

  /**
   * Get minimum balance for rent exemption for token accounts with caching and retry
   */
  @SolanaRetry({})
  @Cacheable({
    ttl: CACHE_CONFIG.TTL.ACCOUNT_INFO, // Network-wide constant
    max: 10, // Small cache since this is a constant per network
    key: () => `token-account-rent-exemption:${TOKEN_ACCOUNT_SIZE}`,
    logger: function (this: SplTokenHandler) {
      return this.logger;
    }
  })
  private async getTokenAccountRentExemption(): Promise<number> {
    const connection = this.connectionManager.getConnection();
    return await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
  }

  /**
   * Ensure token account exists for recipient
   */
  @SolanaRetry({})
  private async ensureTokenAccountExists(
    transaction: Transaction,
    toTokenAccount: PublicKey,
    toPublicKey: PublicKey,
    mintPublicKey: PublicKey,
    fromPublicKey: PublicKey
  ): Promise<void> {
    const connection = this.connectionManager.getConnection();

    try {
      await getAccount(connection, toTokenAccount);
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        // Create associated token account for recipient
        transaction.add(
          createAssociatedTokenAccountInstruction(fromPublicKey, toTokenAccount, toPublicKey, mintPublicKey)
        );
      }
    }
  }
}
