import { bech32 } from '@scure/base';

export function toBech32(prefix: string, data: Uint8Array | number[], limit?: number | false): string {
  const bit5 = bech32.toWords(Uint8Array.from(data));
  return bech32.encode(prefix, bit5, limit);
}

export function fromBech32(data: string, limit?: number | false): [string, Uint8Array] {
  const d = bech32.decode(data as any, limit);
  const bit8 = bech32.fromWords(d.words);
  return [d.prefix, new Uint8Array(bit8)];
}
