import { Transaction, TransactionId } from '../tx';
import {
  Blake2bHashKey,
  Hash,
  TransactionBufferWriter,
  TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT,
  TX_ENCODING_FULL
} from './';

import { base } from '@delandlabs/crypto-lib';

class TransactionHashing {
  static hash(tx: Transaction, includeMassField: boolean): Uint8Array {
    const txBytes = TransactionBufferWriter.writeTransaction(tx, TX_ENCODING_FULL, includeMassField).buffer;
    return base.blake2(txBytes, 256, Blake2bHashKey.TransactionHash);
  }

  static id(tx: Transaction): TransactionId {
    const encodingFlags = tx.isCoinbase() ? TX_ENCODING_FULL : TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT;
    const txBytes = TransactionBufferWriter.writeTransaction(tx, encodingFlags, false).buffer;
    const hash = base.blake2(txBytes, 256, Blake2bHashKey.TransactionID);
    return new Hash(hash);
  }
}

export { TransactionHashing };
