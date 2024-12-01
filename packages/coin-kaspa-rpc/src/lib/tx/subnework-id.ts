import { Buffer } from 'buffer';

const SUBNETWORK_ID_SIZE = 20;

class SubnetworkId {
  public readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    if (bytes.length !== SUBNETWORK_ID_SIZE) {
      throw new Error(`Invalid length: expected ${SUBNETWORK_ID_SIZE}, got ${bytes.length}`);
    }
    this.bytes = bytes;
  }

  static fromByte(b: number): SubnetworkId {
    const bytes = new Uint8Array(SUBNETWORK_ID_SIZE);
    bytes[0] = b;
    return new SubnetworkId(bytes);
  }

  static fromBytes(bytes: Uint8Array): SubnetworkId {
    return new SubnetworkId(bytes);
  }

  isBuiltin(): boolean {
    return this.equals(SUBNETWORK_ID_COINBASE) || this.equals(SUBNETWORK_ID_REGISTRY);
  }

  isNative(): boolean {
    return this.equals(SUBNETWORK_ID_NATIVE);
  }

  isBuiltinOrNative(): boolean {
    return this.isNative() || this.isBuiltin();
  }

  equals(other: SubnetworkId): boolean {
    return this.bytes.every((byte, index) => byte === other.bytes[index]);
  }

  toHex(): string {
    return Buffer.from(this.bytes).toString('hex');
  }

  static fromHex(hexStr: string): SubnetworkId {
    const bytes = Buffer.from(hexStr, 'hex');
    return new SubnetworkId(bytes);
  }

  toString(): string {
    return this.toHex();
  }
}

const SUBNETWORK_ID_NATIVE = SubnetworkId.fromByte(0);
const SUBNETWORK_ID_COINBASE = SubnetworkId.fromByte(1);
const SUBNETWORK_ID_REGISTRY = SubnetworkId.fromByte(2);

export { SubnetworkId, SUBNETWORK_ID_SIZE, SUBNETWORK_ID_NATIVE, SUBNETWORK_ID_COINBASE, SUBNETWORK_ID_REGISTRY };
