import { SubnetworkId, SUBNETWORK_ID_COINBASE } from './';
import { TransactionId, UtxoEntry, TransactionInput, TransactionOutput, TransactionMass } from './entities';
import { TransactionHashing } from '../hashing';

export class Transaction {
  /*
   * The version of the transaction.
   * @remarks this is a 16-bit unsigned integer.
   */
  version: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  /*
   * The lock time of the transaction.
   * @remarks this is a 64-bit unsigned integer.
   */
  lockTime: bigint;
  subnetworkId: SubnetworkId;
  /*
   * The gas of the transaction.
   * @remarks this is a 64-bit unsigned integer.
   */
  gas: bigint;
  payload: Uint8Array;
  private _mass: TransactionMass;
  private _id: TransactionId;

  constructor(
    version: number,
    inputs: TransactionInput[],
    outputs: TransactionOutput[],
    lockTime: bigint,
    subnetworkId: SubnetworkId,
    gas: bigint,
    payload: Uint8Array
  ) {
    this.version = version;
    this.inputs = inputs;
    this.outputs = outputs;
    this.lockTime = lockTime;
    this.subnetworkId = subnetworkId;
    this.gas = gas;
    this.payload = payload;
    this._mass = BigInt(0);
    this._id = this.computeId();
  }

  get mass(): TransactionMass {
    return this._mass;
  }

  private computeId(): TransactionId {
    return TransactionHashing.id(this);
  }

  isCoinbase(): boolean {
    return this.subnetworkId === SUBNETWORK_ID_COINBASE;
  }

  get id(): TransactionId {
    return this._id;
  }

  setMass(mass: TransactionMass): void {
    this._mass = BigInt(mass);
  }

  getMass(): TransactionMass {
    return this._mass;
  }

  withMass(mass: TransactionMass): this {
    this.setMass(mass);
    return this;
  }
}

export interface IVerifiableTransaction {
  tx(): Transaction;

  populatedInput(index: number): [TransactionInput, UtxoEntry];

  populatedInputs(): Iterable<[TransactionInput, UtxoEntry]>;

  inputs(): TransactionInput[];

  outputs(): TransactionOutput[];

  isCoinbase(): boolean;

  id(): TransactionId;

  utxo(index: number): UtxoEntry | undefined;
}
