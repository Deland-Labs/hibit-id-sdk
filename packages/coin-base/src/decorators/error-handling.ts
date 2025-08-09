import {
  WalletError,
  MessageSigningError,
  BalanceQueryError,
  TransactionError,
  FeeEstimationError,
  HibitIdSdkErrorCode
} from '../types/errors';
import { GeneralWalletError } from '../types/general-wallet-error';

interface ErrorContext {
  address?: string;
  tokenAddress?: string;
  transactionHash?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ErrorHandlerConfig {
  chainName?: string;
  errorType: 'signing' | 'balance' | 'transaction' | 'fee' | 'general';
  context?: ErrorContext;
}

/**
 * Wraps an error in the appropriate WalletError subclass
 */
export function wrapError(error: unknown, config: ErrorHandlerConfig, defaultMessage: string): WalletError {
  // If it's already a WalletError, return it
  if (error instanceof WalletError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;
  const fullMessage = `${config.chainName || 'Unknown Chain'}: ${defaultMessage} - ${errorMessage}`;
  const typedContext = config.context || {};
  const context = { chainName: config.chainName, ...typedContext };

  switch (config.errorType) {
    case 'signing':
      // Extract signature from context if available (e.g., the message that was being signed)
      const messageToSign = typedContext.message as string | undefined;
      const signature = messageToSign ? new TextEncoder().encode(messageToSign) : undefined;

      return new MessageSigningError(HibitIdSdkErrorCode.MESSAGE_SIGNING_FAILED, fullMessage, signature, context, cause);

    case 'balance':
      return new BalanceQueryError(
        HibitIdSdkErrorCode.BALANCE_QUERY_FAILED,
        fullMessage,
        typedContext.address || '',
        typedContext.tokenAddress,
        context,
        cause
      );

    case 'transaction':
      return new TransactionError(
        HibitIdSdkErrorCode.TRANSACTION_SIGNING_FAILED,
        fullMessage,
        typedContext.transactionHash,
        context,
        cause
      );

    case 'fee':
      return new FeeEstimationError(HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED, fullMessage, context, cause);

    case 'general':
    default:
      return new GeneralWalletError(HibitIdSdkErrorCode.UNKNOWN_ERROR, fullMessage, context, cause);
  }
}

/**
 * Higher-order function that wraps async methods with error handling
 * Supports runtime chainName resolution for BaseChainWallet usage
 */
export function withErrorHandling(
  config: Omit<ErrorHandlerConfig, 'chainName'> & { chainName?: string },
  defaultMessage: string
) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: { chainInfo?: { name?: string } }, ...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        // Runtime resolution of chainName - check if this has chainInfo property
        const chainName = config.chainName || this.chainInfo?.name || 'Unknown Chain';

        const fullConfig: ErrorHandlerConfig = {
          ...config,
          chainName
        };

        throw wrapError(error, fullConfig, defaultMessage);
      }
    };

    return descriptor;
  };
}
