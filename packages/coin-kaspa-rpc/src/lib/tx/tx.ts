import { SubnetworkId, SUBNETWORK_ID_COINBASE } from './';
import { TransactionId, UtxoEntry, TransactionInput, TransactionOutput, TransactionMass } from './entities';
import { TransactionHashing } from '../hashing';

/**
 * Represents a transaction.
 */
export class Transaction {
  /**
   * The version of the transaction.
   * @remarks This is a 16-bit unsigned integer.
   */
  version: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  /**
   * The lock time of the transaction.
   * @remarks This is a 64-bit unsigned integer.
   */
  lockTime: bigint;
  subnetworkId: SubnetworkId;
  /**
   * The gas of the transaction.
   * @remarks This is a 64-bit unsigned integer.
   */
  gas: bigint;
  payload: Uint8Array;
  private _mass: TransactionMass;
  private _id: TransactionId;

  /**
   * Constructs a new Transaction instance.
   * @param version - The version of the transaction.
   * @param inputs - The inputs of the transaction.
   * @param outputs - The outputs of the transaction.
   * @param lockTime - The lock time of the transaction.
   * @param subnetworkId - The subnetwork ID of the transaction.
   * @param gas - The gas of the transaction.
   * @param payload - The payload of the transaction.
   */
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

  /**
   * Gets the mass of the transaction.
   * @returns The mass of the transaction.
   */
  get mass(): TransactionMass {
    return this._mass;
  }

  /**
   * Computes the ID of the transaction.
   * @returns The computed transaction ID.
   */
  private computeId(): TransactionId {
    return TransactionHashing.id(this);
  }

  /**
   * Checks if the transaction is a coinbase transaction.
   * @returns True if the transaction is a coinbase transaction, otherwise false.
   */
  isCoinbase(): boolean {
    return this.subnetworkId === SUBNETWORK_ID_COINBASE;
  }

  /**
   * Gets the ID of the transaction.
   * @returns The transaction ID.
   */
  get id(): TransactionId {
    return this._id;
  }

  /**
   * Sets the mass of the transaction.
   * @param mass - The mass to set.
   */
  setMass(mass: TransactionMass): void {
    this._mass = BigInt(mass);
  }

  /**
   * Gets the mass of the transaction.
   * @returns The mass of the transaction.
   */
  getMass(): TransactionMass {
    return this._mass;
  }

  /**
   * Sets the mass of the transaction and returns the transaction instance.
   * @param mass - The mass to set.
   * @returns The transaction instance.
   */
  withMass(mass: TransactionMass): this {
    this.setMass(mass);
    return this;
  }
}

/**
 * Interface for verifiable transactions.
 */
export interface IVerifiableTransaction {
  /**
   * Gets the transaction.
   * @returns The transaction.
   */
  tx(): Transaction;

  /**
   * Gets the populated input at the specified index.
   * @param index - The index of the input.
   * @returns A tuple containing the transaction input and UTXO entry.
   */
  populatedInput(index: number): [TransactionInput, UtxoEntry];

  /**
   * Gets all populated inputs.
   * @returns An iterable of tuples containing the transaction inputs and UTXO entries.
   */
  populatedInputs(): Iterable<[TransactionInput, UtxoEntry]>;

  /**
   * Gets the inputs of the transaction.
   * @returns The transaction inputs.
   */
  inputs(): TransactionInput[];

  /**
   * Gets the outputs of the transaction.
   * @returns The transaction outputs.
   */
  outputs(): TransactionOutput[];

  /**
   * Checks if the transaction is a coinbase transaction.
   * @returns True if the transaction is a coinbase transaction, otherwise false.
   */
  isCoinbase(): boolean;

  /**
   * Gets the ID of the transaction.
   * @returns The transaction ID.
   */
  id(): TransactionId;

  /**
   * Gets the UTXO entry at the specified index.
   * @param index - The index of the UTXO entry.
   * @returns The UTXO entry, or undefined if not found.
   */
  utxo(index: number): UtxoEntry | undefined;
}
