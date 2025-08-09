import { ChainAssetType, ChainType } from '@delandlabs/hibit-basic-types';
import BigNumber from 'bignumber.js';
import { Address } from './branded';

/**
 * Token identifier for wallet operations
 */
export interface TokenIdentifier {
  assetType: ChainAssetType;
  tokenAddress?: string;
}

/**
 * Sign message parameters
 */
export interface SignMessageParams {
  message: string;
  /**
   * Whether to use deterministic signing (same input = same output)
   * Default: true for consistency
   */
  deterministic?: boolean;
}

/**
 * Balance query parameters with branded types for type safety
 */
export interface BalanceQueryParams<Chain extends ChainType = ChainType> {
  address: Address<Chain>;
  token: TokenIdentifier;
}

/**
 * Transfer parameters with branded types for type safety
 */
export interface TransferParams<Chain extends ChainType = ChainType> {
  recipientAddress: Address<Chain>;
  amount: BigNumber;
  token: TokenIdentifier;
  payload?: string;
}

/**
 * Transaction confirmation parameters
 */
export interface TransactionConfirmationParams {
  /** Transaction hash/ID */
  txHash: string;
  /** Required number of confirmations (optional, use chain default if not specified) */
  requiredConfirmations?: number;
  /** Timeout in milliseconds (optional, use chain default if not specified) */
  timeoutMs?: number;
  /** Callback for confirmation updates (optional) */
  onConfirmationUpdate?: (confirmations: number, required: number) => void;
}

/**
 * Transaction confirmation result
 */
export interface TransactionConfirmationResult {
  /** Whether the transaction is confirmed */
  isConfirmed: boolean;
  /** Current number of confirmations */
  confirmations: number;
  /** Required number of confirmations */
  requiredConfirmations: number;
  /** Transaction status */
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
  /** Block hash where the transaction was included (if confirmed) */
  blockHash?: string;
  /** Block number where transaction was included (if confirmed) */
  blockNumber?: number;
  /** Gas used (for EVM chains) */
  gasUsed?: bigint;
  /** Final transaction fee */
  transactionFee?: BigNumber;
}
