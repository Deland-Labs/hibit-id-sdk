import { sha256 } from './hash';
import { base58check } from '@scure/base';

export function toBase58Check(data: Uint8Array | number[]): string {
  const bytesCoder = base58check(sha256);
  return bytesCoder.encode(Uint8Array.from(data));
}

export function fromBase58Check(data: string): Uint8Array {
  const bytesCoder = base58check(sha256);
  return bytesCoder.decode(data);
}
