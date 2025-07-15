// Define error types locally to avoid circular dependencies
export enum HibitIdErrorCode {
  USER_CANCEL_CONNECTION = 'USER_CANCEL_CONNECTION',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INVALID_MNEMONIC = 'INVALID_MNEMONIC',
  MNEMONIC_DERIVATION_FAILED = 'MNEMONIC_DERIVATION_FAILED',
  INVALID_DERIVATION_PATH = 'INVALID_DERIVATION_PATH'
}

export class MnemonicError extends Error {
  constructor(
    public code: HibitIdErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MnemonicError';
  }
}
