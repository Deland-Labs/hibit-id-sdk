// Define error types locally to avoid circular dependencies

/**
 * Type-safe error details interfaces
 */
export interface GeneralErrorDetails {
  [key: string]: string | number | boolean | undefined | string[] | Uint8Array | object;
}

export interface ArgumentErrorDetails extends GeneralErrorDetails {
  argumentName?: string;
  expectedType?: string;
  actualType?: string;
  providedValue?: string;
  validationRule?: string;
}

export interface MnemonicErrorDetails extends GeneralErrorDetails {
  wordCount?: number;
  invalidWords?: number;
  invalidWordsDetails?: string[];
  derivationPath?: string;
  encodingFormat?: string;
}

export interface NetworkErrorDetails extends GeneralErrorDetails {
  url?: string;
  statusCode?: number;
  timeout?: number;
  retryCount?: number;
}

export interface TransactionErrorDetails extends GeneralErrorDetails {
  transactionHash?: string;
  recipientAddress?: string;
  amount?: string;
  assetIdentifier?: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface BalanceQueryErrorDetails extends GeneralErrorDetails {
  address?: string;
  assetIdentifier?: string;
  chainId?: string;
}

export interface FeeEstimationErrorDetails extends GeneralErrorDetails {
  gasLimit?: string;
  gasPrice?: string;
  baseFee?: string;
  priorityFee?: string;
}

export interface MessageSigningErrorDetails extends GeneralErrorDetails {
  messageLength?: number;
  signature?: Uint8Array;
  publicKey?: string;
}

export enum HibitIdSdkErrorCode {
  // --- User Interaction & Connection Errors ---
  USER_CANCEL_CONNECTION = 'USER_CANCEL_CONNECTION',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',

  // --- Mnemonic & Key Errors ---
  INVALID_MNEMONIC = 'INVALID_MNEMONIC',
  MNEMONIC_DERIVATION_FAILED = 'MNEMONIC_DERIVATION_FAILED',

  // --- Network Communication Errors ---
  NETWORK_REQUEST_FAILED = 'NETWORK_REQUEST_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',

  // --- Chain Operation Errors ---
  TRANSACTION_SIGNING_FAILED = 'TRANSACTION_SIGNING_FAILED',
  TRANSACTION_BROADCAST_FAILED = 'TRANSACTION_BROADCAST_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  FEE_ESTIMATION_FAILED = 'FEE_ESTIMATION_FAILED',
  BALANCE_QUERY_FAILED = 'BALANCE_QUERY_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  MESSAGE_SIGNING_FAILED = 'MESSAGE_SIGNING_FAILED',

  // --- Parameter & Input Validation Errors ---
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  INVALID_ASSET_IDENTIFIER = 'INVALID_ASSET_IDENTIFIER',
  UNSUPPORTED_ASSET_TYPE = 'UNSUPPORTED_ASSET_TYPE',
  INVALID_RECIPIENT_ADDRESS = 'INVALID_RECIPIENT_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  INVALID_DERIVATION_PATH = 'INVALID_DERIVATION_PATH',

  // --- System & General Errors ---
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED'
}

/**
 * Base error class for all wallet-related errors
 */
export abstract class WalletError extends Error {
  public readonly timestamp: Date;

  constructor(
    public readonly code: HibitIdSdkErrorCode,
    message: string,
    public readonly details?: GeneralErrorDetails,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();

    // Maintain proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a JSON representation of the error
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Error related to mnemonic operations
 */
export class MnemonicError extends WalletError {
  constructor(code: HibitIdSdkErrorCode, message: string, details?: MnemonicErrorDetails, cause?: Error) {
    super(code, message, details, cause);
  }
}

/**
 * Error related to network operations
 */
export class NetworkError extends WalletError {
  constructor(
    code: HibitIdSdkErrorCode,
    message: string,
    public readonly endpoint?: string,
    details?: NetworkErrorDetails,
    cause?: Error
  ) {
    super(code, message, details, cause);
  }
}

/**
 * Error related to transaction operations
 */
export class TransactionError extends WalletError {
  constructor(
    code: HibitIdSdkErrorCode,
    message: string,
    public readonly transactionHash?: string,
    details?: TransactionErrorDetails,
    cause?: Error
  ) {
    super(code, message, details, cause);
  }
}

/**
 * Error related to balance query operations
 */
export class BalanceQueryError extends WalletError {
  constructor(
    code: HibitIdSdkErrorCode,
    message: string,
    public readonly address?: string,
    public readonly assetIdentifier?: string,
    details?: BalanceQueryErrorDetails,
    cause?: Error
  ) {
    super(code, message, details, cause);
  }
}

/**
 * Error related to fee estimation operations
 */
export class FeeEstimationError extends WalletError {
  constructor(code: HibitIdSdkErrorCode, message: string, details?: FeeEstimationErrorDetails, cause?: Error) {
    super(code, message, details, cause);
  }
}

/**
 * Error related to message signing operations
 */
export class MessageSigningError extends WalletError {
  constructor(
    code: HibitIdSdkErrorCode,
    message: string,
    public readonly signature?: Uint8Array,
    details?: MessageSigningErrorDetails,
    cause?: Error
  ) {
    super(code, message, details, cause);
  }
}

/**
 * Error related to argument validation
 */
export class ArgumentError extends WalletError {
  constructor(code: HibitIdSdkErrorCode, message: string, details?: ArgumentErrorDetails, cause?: Error) {
    super(code, message, details, cause);
  }
}
