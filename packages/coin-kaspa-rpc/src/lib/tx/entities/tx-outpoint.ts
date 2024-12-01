import { TransactionId } from './';

/**
 * Represents a transaction outpoint, which is a reference to a specific output in a transaction.
 */
class TransactionOutpoint {
  /**
   * The ID of the transaction.
   */
  transactionId: TransactionId;

  /**
   * The index of the output in the transaction.
   * @remarks This is a u32.
   */
  index: number;

  /**
   * Creates a new TransactionOutpoint.
   * @param transactionId - The ID of the transaction.
   * @param index - The index of the output in the transaction.
   */
  constructor(transactionId: TransactionId, index: number) {
    this.transactionId = transactionId;
    this.index = index;
  }

  /**
   * Returns a string representation of the transaction outpoint.
   * @returns A string in the format (transactionId, index).
   */
  toString(): string {
    return `(${Buffer.from(this.transactionId).toString('hex')}, ${this.index})`;
  }
}

export { TransactionOutpoint };
