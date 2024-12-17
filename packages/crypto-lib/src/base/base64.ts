import { base64 } from '@scure/base';

export function toBase64(data: Uint8Array | Buffer | number[]): string {
  return base64.encode(Uint8Array.from(data));
}

export function fromBase64(data: string): Uint8Array {
  return base64.decode(data);
}
