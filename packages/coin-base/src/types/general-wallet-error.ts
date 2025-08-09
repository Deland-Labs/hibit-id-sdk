import { WalletError, HibitIdSdkErrorCode, GeneralErrorDetails } from './errors';

/**
 * General wallet error for unknown or unspecified errors
 */
export class GeneralWalletError extends WalletError {
  constructor(code: HibitIdSdkErrorCode, message: string, details?: GeneralErrorDetails, cause?: Error) {
    super(code, message, details, cause);
  }
}
