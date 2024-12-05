import { Transaction } from 'src/lib/tx/tx.ts';
import { TransactionInput, UtxoEntry } from 'src/lib/tx/model';

/**
 * Represents a transaction that can be signed.
 */
class SignableTransaction {
  tx: Transaction;
  entries: UtxoEntry[];
  mass: bigint;
  fees: bigint;

  /**
   * Creates an instance of SignableTransaction.
   * @param {Transaction} tx - The transaction to be signed.
   * @param {UtxoEntry[]} entries - The UTXO entries associated with the transaction.
   * @param {bigint} mass - The mass of the transaction.
   * @param {bigint} fees - The fees of the transaction.
   */
  constructor(tx: Transaction, entries: UtxoEntry[], mass: bigint = 0n, fees: bigint = 0n) {
    if (tx.inputs.length !== entries.length) {
      throw new Error('The transaction inputs length not match entries length');
    }

    this.tx = tx;
    this.entries = entries;
    this.mass = mass;
    this.fees = fees;
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
