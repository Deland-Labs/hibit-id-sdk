import { TFunction } from "i18next";

export enum HibitIDErrorCode {
  MNEMONIC_NOT_CREATED = 1000,
  WALLET_LOCKED = 1001,
}

export class HibitIDError extends Error {
  constructor(public code: HibitIDErrorCode, message?: string) {
    super(message ?? '');
  }

  public override toString() {
    return `HibitIDError ${this.code}: ${this.message}`;
  }
}

export const getErrorMessage = (e: any, t?: TFunction) => {
  let msg = '';
  if (e instanceof HibitIDError) {
    msg = t?.(HibitIDErrorCode[e.code]) ?? HibitIDErrorCode[e.code];
  } else if (e instanceof Error) {
    msg = e.message;
  } else {
    msg = JSON.stringify(e)
  }
  return msg
}
