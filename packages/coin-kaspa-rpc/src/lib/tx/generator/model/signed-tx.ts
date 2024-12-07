import { SignableTransaction } from './signable-tx';
import { ISubmitableTransaction } from './submitable-tx';

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

  /**
   * Convert to a submitable transaction.
   * @returns {ISubmitableTransaction} The submitable transaction.
   */
  toSubmitable(): ISubmitableTransaction {
    return this.transaction.toSubmitable();
  }
}

export { SignedType, SignedTransaction };
