import { Buffer } from 'buffer';
import { Transaction } from '../tx';
import { TransactionInput, TransactionOutpoint, TransactionOutput } from '../model';

/*
 * Transaction encoding flags
 * @remarks this is an 8-bit unsigned integer.
 */
export type TxEncodingFlags = number;

/**
 * Transaction serialize
 */
class TransactionSerializer {
  private _buffer: Buffer;

  constructor() {
    this._buffer = Buffer.alloc(0);
  }

  /**
   * Getter for the buffer.
   * @returns {Buffer} The current buffer.
   */
  get buffer() {
    return this._buffer;
  }

  /**
   * Serializers a transaction to the buffer.
   * @param {Transaction} tx - The transaction to serialize.
   * @param {TxEncodingFlags} encodingFlags - The encoding flags for the transaction.
   * @param {boolean} includeMassField - Whether to include the mass field.
   * @returns {TransactionSerializer} The serializer instance.
   */
  public static serialize(tx: Transaction, encodingFlags: TxEncodingFlags, includeMassField: boolean) {
    const serializer = new TransactionSerializer();
    serializer.serializeUint16(tx.version);

    // inputs
    serializer.serializeLength(tx.inputs.length);
    tx.inputs.forEach((input) => serializer.serializeInput(input, encodingFlags));

    // outputs
    serializer.serializeLength(tx.outputs.length);
    tx.outputs.forEach((output) => serializer.serializeOutput(output));

    serializer.serializeUint64(tx.lockTime);
    serializer.serializeRawData(tx.subnetworkId.bytes);
    serializer.serializeUint64(tx.gas);
    serializer.serializeDataWithLength(tx.payload);

    // TODO:
    //      1. Avoid passing a boolean and hash the mass only if > 0 (requires setting the mass to 0 on BBT).
    //      2. Use TxEncodingFlags to avoid including the mass for tx ID

    if (includeMassField) {
      if (tx.mass > 0) serializer.serializeUint64(tx.mass);
    }

    return serializer;
  }

  /**
   * Serializers a transaction input to the buffer.
   * @param {TransactionInput} input - The transaction input to serialize.
   * @param {TxEncodingFlags} encodingFlags - The encoding flags for the input.
   * @returns {TransactionSerializer} The serializer instance.
   */
  private serializeInput(input: TransactionInput, encodingFlags: TxEncodingFlags) {
    this.serializeOutpoint(input.previousOutpoint);
    if ((encodingFlags & TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT) !== TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT) {
      this.serializeDataWithLength(input.signatureScript).serializeUint8(input.sigOpCount);
    } else {
      this.serializeDataWithLength(Buffer.from([]));
    }
    return this.serializeUint64(input.sequence);
  }

  /**
   * Serializers a transaction outpoint to the buffer.
   * @param {TransactionOutpoint} outpoint - The transaction outpoint to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   */
  private serializeOutpoint(outpoint: TransactionOutpoint) {
    this.serializeRawData(outpoint.transactionId.toBytes()).serializeRawData(
      new Uint8Array(new Uint32Array([outpoint.index]).buffer)
    );
  }

  /**
   * Serializers a transaction output to the buffer.
   * @param {TransactionOutput} output - The transaction output to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   */
  private serializeOutput(output: TransactionOutput) {
    return this.serializeUint64(output.value)
      .serializeUint16(output.scriptPublicKey.version)
      .serializeDataWithLength(output.scriptPublicKey.script);
  }

  /**
   * Serializers a boolean value to the buffer.
   * @param {boolean} data - The boolean value to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   */
  // @ts-ignore
  private serializeBool(data: boolean) {
    return this.serializeUint8(data ? 1 : 0);
  }

  /**
   * Serializers an 8-bit unsigned integer to the buffer.
   * @param {number} data - The 8-bit unsigned integer to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   * @throws {Error} If the value is not a valid 8-bit unsigned integer.
   */
  private serializeUint8(data: number) {
    if (data < 0 || data > 255) throw new Error(`Invalid uint 8 value: ${data}`);

    return this.serializeRawData(Buffer.from([data]));
  }

  /**
   * Serializers a 16-bit unsigned integer to the buffer.
   * @param {number} data - The 16-bit unsigned integer to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   * @throws {Error} If the value is not a valid 16-bit unsigned integer.
   */
  private serializeUint16(data: number) {
    if (data < 0 || data > 65535) throw new Error(`Invalid uint 16 value: ${data}`);

    return this.serializeRawData(Buffer.from(new Uint16Array([data]).buffer));
  }

  /**
   * Serializers a 32-bit unsigned integer to the buffer.
   * @param {number} data - The 32-bit unsigned integer to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   * @throws {Error} If the value is not a valid 32-bit unsigned integer.
   */
  // @ts-ignore
  private serializeUint32(data: number) {
    if (data < 0 || data > 4294967295) throw new Error(`Invalid uint 32 value: ${data}`);

    return this.serializeRawData(Buffer.from(new Uint32Array([data]).buffer));
  }

  /**
   * Serializers a length-prefixed value to the buffer.
   * @param {number} data - The length to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   */
  private serializeLength(data: number) {
    return this.serializeUint64(BigInt(data));
  }

  /**
   * Serializers a 64-bit unsigned integer to the buffer.
   * @param {bigint} data - The 64-bit unsigned integer to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   * @throws {Error} If the value is not a valid 64-bit unsigned integer.
   */
  private serializeUint64(data: bigint) {
    if (data < 0 || data > 18446744073709551615n) throw new Error(`Invalid uint 64 value: ${data}`);
    return this.serializeRawData(Buffer.from(new BigUint64Array([data]).buffer));
  }

  /**
   * Serializers data with a length prefix to the buffer.
   * @param {Uint8Array} data - The data to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   */
  private serializeDataWithLength(data: Uint8Array) {
    return this.serializeLength(data.length).serializeRawData(data);
  }

  /**
   * Serializers raw data to the buffer.
   * @param {Uint8Array} buffer - The raw data to serialize.
   * @returns {TransactionSerializer} The serializer instance.
   */
  private serializeRawData(buffer: Uint8Array) {
    this._buffer = Buffer.concat([this._buffer, buffer]);
    return this;
  }
}

/*
 * Transaction encoding flags
 * @remarks this is a 8-bit unsigned integer.
 */
const TX_ENCODING_FULL: TxEncodingFlags = 0;

/*
 * Transaction encoding flags
 * @remarks this is a 8-bit unsigned integer.
 */
const TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT: TxEncodingFlags = 1;
export { TransactionSerializer, TX_ENCODING_FULL, TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT };
