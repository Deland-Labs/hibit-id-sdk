import { Buffer } from 'buffer';
import { Transaction, TransactionInput, TransactionOutpoint, TransactionOutput } from '../tx';

/*
 * Transaction encoding flags
 * @remarks this is a 8-bit unsigned integer.
 */
export type TxEncodingFlags = number;

class TransactionBufferWriter {
  private _buffer: Buffer;

  constructor() {
    this._buffer = Buffer.alloc(0);
  }

  get buffer() {
    return this._buffer;
  }

  public static writeTransaction(tx: Transaction, encodingFlags: TxEncodingFlags, includeMassField: boolean) {
    const writer = new TransactionBufferWriter();
    writer.writeUint16(tx.version);

    // inputs
    writer.writeLength(tx.inputs.length);
    tx.inputs.forEach((input) => writer.writeInput(input, encodingFlags));

    // outputs
    writer.writeLength(tx.outputs.length);
    tx.outputs.forEach((output) => writer.writeOutput(output));

    writer.writeUint64(tx.lockTime);
    writer.writeRawData(tx.subnetworkId.bytes);
    writer.writeUint64(tx.gas);
    writer.writeDataWithLength(tx.payload);

    // TODO:
    //      1. Avoid passing a boolean and hash the mass only if > 0 (requires setting the mass to 0 on BBT).
    //      2. Use TxEncodingFlags to avoid including the mass for tx ID

    if (includeMassField) {
      if (tx.mass > 0) writer.writeUint64(tx.mass);
    }

    return writer;
  }

  public writeInput(input: TransactionInput, encodingFlags: TxEncodingFlags) {
    this.writeOutpoint(input.previousOutpoint);
    if ((encodingFlags & TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT) !== TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT) {
      this.writeDataWithLength(input.signatureScript).writeUint8(input.sigOpCount);
    } else {
      this.writeDataWithLength(Buffer.from([]));
    }
    return this.writeUint64(input.sequence);
  }

  public writeOutpoint(outpoint: TransactionOutpoint) {
    this.writeRawData(outpoint.transactionId.toBytes()).writeRawData(
      new Uint8Array(new Uint32Array([outpoint.index]).buffer)
    );
  }

  public writeOutput(output: TransactionOutput) {
    return this.writeUint64(output.value)
      .writeUint16(output.scriptPublicKey.version)
      .writeDataWithLength(output.scriptPublicKey.script);
  }

  public writeBool(data: boolean) {
    return this.writeUint8(data ? 1 : 0);
  }

  public writeUint8(data: number) {
    if (data < 0 || data > 255) throw new Error(`Invalid uint 8 value: ${data}`);

    return this.writeRawData(Buffer.from([data]));
  }

  public writeUint16(data: number) {
    if (data < 0 || data > 65535) throw new Error(`Invalid uint 16 value: ${data}`);

    return this.writeRawData(Buffer.from(new Uint16Array([data]).buffer));
  }

  public writeUint32(data: number) {
    if (data < 0 || data > 4294967295) throw new Error(`Invalid uint 32 value: ${data}`);

    return this.writeRawData(Buffer.from(new Uint32Array([data]).buffer));
  }

  public writeLength(data: number) {
    return this.writeUint64(BigInt(data));
  }

  public writeUint64(data: bigint) {
    if (data < 0 || data > 18446744073709551615n) throw new Error(`Invalid uint 64 value: ${data}`);
    return this.writeRawData(Buffer.from(new BigUint64Array([data]).buffer));
  }

  public writeDataWithLength(data: Uint8Array) {
    return this.writeLength(data.length).writeRawData(data);
  }

  public writeRawData(buffer: Uint8Array) {
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
export { TransactionBufferWriter, TX_ENCODING_FULL, TX_ENCODING_EXCLUDE_SIGNATURE_SCRIPT };
