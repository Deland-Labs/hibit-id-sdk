import { Transaction } from 'src/lib/tx/tx.ts';
import { TransactionInput, UtxoEntry } from 'src/lib/tx/model';

/**
 * Represents a transaction that can be signed.
 */
class SignableTransaction {
  tx: Transaction;
  entries: UtxoEntry[];

  /**
   * Creates an instance of SignableTransaction.
   * @param {Transaction} tx - The transaction to be signed.
   * @param {UtxoEntry[]} entries - The UTXO entries associated with the transaction.
   */
  constructor(tx: Transaction, entries: UtxoEntry[]) {
    if (tx.inputs.length !== 0 && entries.length) {
      throw new Error('The transaction inputs length not match entries length');
    }

    this.tx = tx;
    this.entries = entries;
  }

  /**
   * Populates the input for the given index.
   * @param {number} index - The index of the input to populate.
   * @returns {[TransactionInput, UtxoEntry]} The populated transaction input and UTXO entry.
   * @throws Will throw an error if the UTXO entry at the given index is not populated.
   */
  populatedInput(index: number): [TransactionInput, UtxoEntry] {
    if (!this.entries[index]) {
      throw new Error('expected to be called only following full UTXO population');
    }
    return [this.tx.inputs[index], this.entries[index]!];
  }
}

export { SignableTransaction };
