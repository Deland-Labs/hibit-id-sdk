import { Transaction } from 'src/lib/tx/tx.ts';
import { UtxoEntryReference } from 'src/lib/tx/model';

/**
 * Represents a transaction that can be signed.
 */
class SignableTransaction {
  tx: Transaction;
  entries: UtxoEntryReference[];

  /**
   * Creates an instance of SignableTransaction.
   * @param {Transaction} tx - The transaction to be signed.
   * @param {UtxoEntryReference[]} entries - The UTXO entries associated with the transaction.
   */
  constructor(tx: Transaction, entries: UtxoEntryReference[]) {
    this.tx = tx;
    this.entries = entries;
  }
}

export { SignableTransaction };
