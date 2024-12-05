import { Address } from 'src/lib/address';
import { TransactionOutpoint, UtxoEntry } from '../';
import { ScriptPublicKey } from 'src/lib/consensus';

/**
 * Represents a client-side UTXO (Unspent Transaction Output) entry.
 */
class ClientUtxoEntry extends UtxoEntry {
  address?: Address;
  outpoint: TransactionOutpoint;

  /**
   * Constructs a new ClientUtxoEntry.
   * @param address - The address associated with the UTXO.
   * @param outpoint - The transaction outpoint.
   * @param amount - The amount of the UTXO.
   * @param scriptPublicKey - The script public key.
   * @param blockDaaScore - The block DAA score.
   * @param isCoinbase - Indicates if the UTXO is from a coinbase transaction.
   */
  constructor(
    address: Address | undefined,
    outpoint: TransactionOutpoint,
    amount: bigint,
    scriptPublicKey: ScriptPublicKey,
    blockDaaScore: bigint,
    isCoinbase: boolean
  ) {
    super(amount, scriptPublicKey, blockDaaScore, isCoinbase);
    this.address = address;
    this.outpoint = outpoint;
  }
}

export { ClientUtxoEntry };
