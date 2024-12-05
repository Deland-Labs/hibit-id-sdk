import { SignableTransaction } from './signable-tx';
import { Transaction } from 'src/lib/tx/tx.ts';

/**
 * Enum representing the signed state of a transaction.
 */
enum SignedType {
  Fully,
  Partially
}

class SignedTransaction {
  type: SignedType;
  transaction: Transaction;

  constructor(type: SignedType, transaction: SignableTransaction) {
    this.type = type;
    this.transaction = transaction.tx;
  }
}

export { SignedType, SignedTransaction };
