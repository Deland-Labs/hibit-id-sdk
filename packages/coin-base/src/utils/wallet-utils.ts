import { BalanceQueryError, TransactionError, FeeEstimationError, HibitIdSdkErrorCode } from '../types/errors';
import { ChainValidation } from '../validation/chain-validation';
import { ChainType } from '@delandlabs/hibit-basic-types';

/**
 * Common utility functions for wallet implementations
 */

/**
 * Generic address validation wrapper
 * @param address - The address to validate
 * @param validator - Function that performs the actual validation (may throw)
 * @returns True if valid, false otherwise
 */
export function validateAddress(address: string, validator: (addr: string) => unknown): boolean {
  try {
    validator(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generic address validation function that throws context-appropriate errors
 * @param address - The address to validate
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 * @param context - The context for error handling ('balance', 'transaction', 'fee')
 */
function assertValidAddressWithContext(
  address: string,
  chainType: ChainType,
  chainName: string,
  context: 'balance' | 'transaction' | 'fee'
): void {
  const isValid = ChainValidation.isValidWalletAddress(address, chainType);
  if (!isValid) {
    switch (context) {
      case 'balance':
        throw new BalanceQueryError(HibitIdSdkErrorCode.BALANCE_QUERY_FAILED, `${chainName}: Invalid wallet address`);
      case 'transaction':
        throw new TransactionError(
          HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED,
          `${chainName}: Invalid recipient address`
        );
      case 'fee':
        throw new FeeEstimationError(
          HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED,
          `${chainName}: Invalid recipient address for fee estimation`
        );
    }
  }
}

/**
 * Validates address and throws BalanceQueryError if invalid
 * @param address - The address to validate
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 */
export function assertValidAddressForBalance(address: string, chainType: ChainType, chainName: string): void {
  assertValidAddressWithContext(address, chainType, chainName, 'balance');
}

/**
 * Validates address and throws TransactionError if invalid
 * @param address - The address to validate
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 */
export function assertValidAddressForTransaction(address: string, chainType: ChainType, chainName: string): void {
  assertValidAddressWithContext(address, chainType, chainName, 'transaction');
}

/**
 * Validates address and throws FeeEstimationError if invalid
 * @param address - The address to validate
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 */
export function assertValidAddressForFeeEstimation(address: string, chainType: ChainType, chainName: string): void {
  assertValidAddressWithContext(address, chainType, chainName, 'fee');
}

/**
 * Generic amount validation function
 * @param amount - The amount to validate
 * @param chainName - Name of the chain for error message
 * @param context - The context for error handling ('transaction' | 'fee')
 */
function assertValidAmountWithContext(
  amount: { isNaN: () => boolean; isZero: () => boolean; isNegative: () => boolean },
  chainName: string,
  context: 'transaction' | 'fee'
): void {
  if (amount.isNaN() || amount.isZero() || amount.isNegative()) {
    switch (context) {
      case 'transaction':
        throw new TransactionError(
          HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED,
          `${chainName}: Invalid transfer amount`
        );
      case 'fee':
        throw new FeeEstimationError(HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED, `${chainName}: Invalid transfer amount`);
    }
  }
}

/**
 * Validates transfer amount and throws TransactionError if invalid
 * @param amount - The amount to validate
 * @param chainName - Name of the chain for error message
 */
export function assertValidTransferAmount(
  amount: { isNaN: () => boolean; isZero: () => boolean; isNegative: () => boolean },
  chainName: string
): void {
  assertValidAmountWithContext(amount, chainName, 'transaction');
}

/**
 * Validates amount for fee estimation and throws FeeEstimationError if invalid
 * @param amount - The amount to validate
 * @param chainName - Name of the chain for error message
 */
export function assertValidAmountForFeeEstimation(
  amount: { isNaN: () => boolean; isZero: () => boolean; isNegative: () => boolean },
  chainName: string
): void {
  assertValidAmountWithContext(amount, chainName, 'fee');
}

/**
 * Generic token address validation function
 * @param tokenAddress - The token address to validate (optional)
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 * @param context - The context for error handling
 */
function assertValidTokenAddressWithContext(
  tokenAddress: string | undefined,
  chainType: ChainType,
  chainName: string,
  context: 'balance' | 'transaction' | 'fee' | 'decimals'
): void {
  const contextMessages = {
    balance: 'Token address is required',
    transaction: 'Token address is required',
    fee: 'Token address is required for fee estimation',
    decimals: 'Token address is required for decimals query'
  };

  const invalidMessages = {
    balance: 'Invalid token address',
    transaction: 'Invalid token address',
    fee: 'Invalid token address for fee estimation',
    decimals: 'Invalid token address for decimals query'
  };

  if (!tokenAddress) {
    const message = `${chainName}: ${contextMessages[context]}`;
    switch (context) {
      case 'balance':
      case 'decimals':
        throw new BalanceQueryError(HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER, message);
      case 'transaction':
        throw new TransactionError(HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER, message);
      case 'fee':
        throw new FeeEstimationError(HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER, message);
    }
  }

  const isValid = ChainValidation.isValidTokenAddress(tokenAddress, chainType);
  if (!isValid) {
    const message = `${chainName}: ${invalidMessages[context]}`;
    switch (context) {
      case 'balance':
      case 'decimals':
        throw new BalanceQueryError(HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER, message);
      case 'transaction':
        throw new TransactionError(HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER, message);
      case 'fee':
        throw new FeeEstimationError(HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER, message);
    }
  }
}

/**
 * Validates token address and throws BalanceQueryError if invalid
 * @param tokenAddress - The token address to validate (optional)
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 */
export function assertValidTokenAddressForBalance(
  tokenAddress: string | undefined,
  chainType: ChainType,
  chainName: string
): void {
  assertValidTokenAddressWithContext(tokenAddress, chainType, chainName, 'balance');
}

/**
 * Validates token address and throws TransactionError if invalid
 * @param tokenAddress - The token address to validate (optional)
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 */
export function assertValidTokenAddressForTransaction(
  tokenAddress: string | undefined,
  chainType: ChainType,
  chainName: string
): void {
  assertValidTokenAddressWithContext(tokenAddress, chainType, chainName, 'transaction');
}

/**
 * Validates token address and throws FeeEstimationError if invalid
 * @param tokenAddress - The token address to validate (optional)
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 */
export function assertValidTokenAddressForFeeEstimation(
  tokenAddress: string | undefined,
  chainType: ChainType,
  chainName: string
): void {
  assertValidTokenAddressWithContext(tokenAddress, chainType, chainName, 'fee');
}

/**
 * Validates token address for decimals query and throws appropriate error if invalid
 * @param tokenAddress - The token address to validate (optional)
 * @param chainType - The chain type enum
 * @param chainName - Name of the chain for error message
 */
export function assertValidTokenAddressForDecimals(
  tokenAddress: string | undefined,
  chainType: ChainType,
  chainName: string
): void {
  assertValidTokenAddressWithContext(tokenAddress, chainType, chainName, 'decimals');
}

/**
 * Helper to clean up object references to prevent memory leaks
 * Sets all specified properties to null
 * @param target - The object containing properties to clean
 * @param properties - Array of property names to nullify
 */
export function cleanupReferences(target: Record<string, any>, properties: string[]): void {
  properties.forEach((prop) => {
    if (prop in target) {
      target[prop] = null;
    }
  });
}

/**
 * Creates a ready promise that resolves when wallet initialization is complete
 * @param initFunction - Async function that initializes the wallet
 * @returns Promise that resolves when initialization is complete
 */
export function createReadyPromise(initFunction: () => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    initFunction().then(resolve).catch(reject);
  });
}
