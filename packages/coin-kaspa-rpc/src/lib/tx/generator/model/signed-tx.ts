import { SignableTransaction } from './signable-tx';
import { ISerializableTransaction } from './serializable-tx';

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

  toSerializable(): ISerializableTransaction {
    return this.transaction.toSerializable();
  }
}

export { SignedType, SignedTransaction };
