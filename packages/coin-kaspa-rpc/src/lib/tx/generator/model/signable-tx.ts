import { DataKind } from './data-kind';
import { TransactionId, TransactionInput, UtxoEntry, UtxoEntryReference } from '../../../tx/model';
import { Transaction } from '../../../tx/tx';
import { ISerializableTransaction } from './serializable-tx';
import { base } from '@delandlabs/crypto-lib';

/**
 * Represents a transaction that can be signed.
 */
class SignableTransaction {
  id: TransactionId;
  tx: Transaction;
  entries: UtxoEntryReference[];
  paymentAmount: bigint;
  changeAmount: bigint;
  aggregateInputAmount: bigint;
  aggregateOutputAmount: bigint;
  minimumSignatures: number;
  mass: bigint;
  feeAmount: bigint;
  kind: DataKind;

  /**
   * Creates an instance of SignableTransaction.
   * @param {Transaction} tx - The transaction to be signed.
   * @param {UtxoEntry[]} entries - The UTXO entries associated with the transaction.
   * @param {bigint} paymentAmount - The payment amount of the transaction.
   * @param {bigint} changeAmount - The change amount of the transaction.
   * @param {bigint} aggregateInputAmount - The aggregate input amount of the transaction.
   * @param {bigint} aggregateOutputAmount - The aggregate output amount of the transaction.
   * @param {number} minimumSignatures - The minimum number of signatures required.
   * @param {bigint} mass - The mass of the transaction.
   * @param {bigint} feeAmount - The fee amount of the transaction.
   * @param {DataKind} kind - The kind of the transaction.
   */
  constructor(
    tx: Transaction,
    entries: UtxoEntryReference[],
    paymentAmount: bigint = 0n,
    changeAmount: bigint = 0n,
    aggregateInputAmount: bigint = 0n,
    aggregateOutputAmount: bigint = 0n,
    minimumSignatures: number = 0,
    mass: bigint = 0n,
    feeAmount: bigint = 0n,
    kind: DataKind = DataKind.NoOp
  ) {
    this.id = tx.id;
    this.tx = tx;
    this.entries = entries;
    this.paymentAmount = paymentAmount;
    this.changeAmount = changeAmount;
    this.aggregateInputAmount = aggregateInputAmount;
    this.aggregateOutputAmount = aggregateOutputAmount;
    this.minimumSignatures = minimumSignatures;
    this.mass = mass;
    this.feeAmount = feeAmount;
    this.kind = kind;
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

  toSerializable(): ISerializableTransaction {
    return {
      id: this.id.toString(),
      version: this.tx.version,
      inputs: this.tx.inputs.map((input, index) => ({
        transactionId: input.previousOutpoint.transactionId.toString(),
        index: input.previousOutpoint.index,
        sequence: input.sequence,
        sigOpCount: input.sigOpCount,
        signatureScript: base.toHex(input.signatureScript),
        utxo: {
          address: this.entries[index].address ? this.entries[index].address.toString() : null,
          amount: this.entries[index].amount,
          scriptPublicKey: {
            version: this.entries[index].scriptPublicKey.version,
            scriptPublicKey: base.toHex(this.entries[index].scriptPublicKey.script)
          },
          blockDaaScore: this.entries[index].blockDaaScore,
          isCoinbase: this.entries[index].isCoinbase
        }
      })),
      outputs: this.tx.outputs.map((output) => ({
        value: output.value,
        scriptPublicKey: {
          version: output.scriptPublicKey.version,
          scriptPublicKey: base.toHex(output.scriptPublicKey.script)
        }
      })),
      lockTime: this.tx.lockTime,
      gas: this.tx.gas,
      mass: this.mass,
      subnetworkId: this.tx.subnetworkId.toString(),
      payload: base.toHex(this.tx.payload)
    };
  }
}

export { SignableTransaction };
