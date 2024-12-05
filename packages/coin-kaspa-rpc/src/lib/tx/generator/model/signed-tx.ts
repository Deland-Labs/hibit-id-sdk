import { SignableTransaction } from './signable-tx';

/**
 * Enum representing the signed state of a transaction.
 */
enum SignedType {
  Fully,
  Partially
}

class SignedTransaction {
  type: SignedType;
  transaction: SignableTransaction;

  constructor(type: SignedType, transaction: SignableTransaction) {
    this.type = type;
    this.transaction = transaction;
  }
}

export { SignedType, SignedTransaction };
