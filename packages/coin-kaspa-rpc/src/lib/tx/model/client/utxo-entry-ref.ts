import { Address } from '../../../address';
import { TransactionId, TransactionOutpoint } from '../';
import { ClientUtxoEntry } from './utxo-entry';
import { ScriptPublicKey } from '../../../consensus';

/**
 * Represents a reference to a UTXO entry.
 */
class UtxoEntryReference {
  utxo: ClientUtxoEntry;

  /**
   * Constructs a new UtxoEntryReference.
   * @param utxo - The client UTXO entry.
   */
  constructor(utxo: ClientUtxoEntry) {
    this.utxo = utxo;
  }

  /**
   * Converts the UTXO entry reference to a string.
   * @returns The string representation of the UTXO entry reference.
   */
  toString(): string {
    return JSON.stringify(this.utxo);
  }

  /**
   * Gets the client UTXO entry.
   * @returns The client UTXO entry.
   */
  get entry(): ClientUtxoEntry {
    return this.utxo;
  }

  /**
   * Gets the transaction outpoint.
   * @returns The transaction outpoint.
   */
  get outpoint(): TransactionOutpoint {
    return this.utxo.outpoint;
  }

  /**
   * Gets the transaction ID.
   * @returns The transaction ID.
   */
  get transactionId(): TransactionId {
    return this.utxo.outpoint.transactionId;
  }

  /**
   * Gets the address associated with the UTXO.
   * @returns The address or undefined if not set.
   */
  get address(): Address | undefined {
    return this.utxo.address;
  }

  /**
   * Gets the amount of the UTXO.
   * @returns The amount of the UTXO.
   */
  get amount(): bigint {
    return this.utxo.amount;
  }

  /**
   * Indicates if the UTXO is from a coinbase transaction.
   * @returns True if the UTXO is from a coinbase transaction, otherwise false.
   */
  get isCoinbase(): boolean {
    return this.utxo.isCoinbase;
  }

  /**
   * Gets the block DAA score.
   * @returns The block DAA score.
   */
  get blockDaaScore(): bigint {
    return this.utxo.blockDaaScore;
  }

  /**
   * Gets the script public key.
   * @returns The script public key.
   */
  get scriptPublicKey(): ScriptPublicKey {
    return this.utxo.scriptPublicKey;
  }
}

export { UtxoEntryReference };
