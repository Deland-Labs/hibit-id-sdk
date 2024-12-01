import { ScriptPublicKey } from '../';

/**
 * Holds details about an individual transaction output in a utxo
 * set such as whether or not it was contained in a coinbase tx, the daa
 * score of the block that accepts the tx, its public key script, and how
 * much it pays.
 * @category Consensus
 */
class UtxoEntry {
  amount: bigint;
  scriptPublicKey: ScriptPublicKey;
  blockDaaScore: bigint;
  isCoinbase: boolean;

  /**
   * Creates an instance of UtxoEntry.
   * @param {bigint} amount - The amount of the transaction output.
   * @param {ScriptPublicKey} scriptPublicKey - The public key script of the transaction output.
   * @param {bigint} blockDaaScore - The DAA score of the block that accepts the transaction.
   * @param {boolean} isCoinbase - Indicates if the transaction is a coinbase transaction.
   */
  constructor(amount: bigint, scriptPublicKey: ScriptPublicKey, blockDaaScore: bigint, isCoinbase: boolean) {
    this.amount = amount;
    this.scriptPublicKey = scriptPublicKey;
    this.blockDaaScore = blockDaaScore;
    this.isCoinbase = isCoinbase;
  }
}

export { UtxoEntry };
