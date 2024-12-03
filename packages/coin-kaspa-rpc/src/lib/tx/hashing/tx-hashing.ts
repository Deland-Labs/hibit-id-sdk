import { Transaction, TransactionId } from '../';
import {
  Blake2bHashKey,
  Hash,
  TransactionBufferWriter,
  TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT,
  TX_ENCODING_FULL
} from './';

import { base } from '@delandlabs/crypto-lib';

/**
 * Class providing hashing utilities for transactions.
 */
class TransactionHashing {
  /**
   * Computes the hash of a transaction.
   *
   * @param {Transaction} tx - The transaction to hash.
   * @param {boolean} includeMassField - Whether to include the mass field in the hash.
   * @returns {Uint8Array} The computed hash as a Uint8Array.
   */
  static hash(tx: Transaction, includeMassField: boolean): Uint8Array {
    const txBytes = TransactionBufferWriter.writeTransaction(tx, TX_ENCODING_FULL, includeMassField).buffer;
    return base.blake2(txBytes, 256, Blake2bHashKey.TransactionHash);
  }

  /**
   * Computes the ID of a transaction.
   *
   * @param {Transaction} tx - The transaction to compute the ID for.
   * @returns {TransactionId} The computed transaction ID.
   */
  static id(tx: Transaction): TransactionId {
    const encodingFlags = tx.isCoinbase() ? TX_ENCODING_FULL : TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT;
    const txBytes = TransactionBufferWriter.writeTransaction(tx, encodingFlags, false).buffer;
    const hash = base.blake2(txBytes, 256, Blake2bHashKey.TransactionID);
    return new Hash(hash);
  }
}

export { TransactionHashing };
