import { ValidationError } from '../errors';
export function toHex(data: Uint8Array | number[], addPrefix: boolean = false): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return addPrefix ? '0x' + hex : hex;
}

export function fromHex(data: string): Uint8Array {
  if (data.startsWith('0x')) {
    data = data.substring(2);
  }
  if (data.length % 2 !== 0) {
    throw new ValidationError('Invalid hex string: odd length');
  }
  const bytes = new Uint8Array(data.length / 2);
  for (let i = 0; i < data.length; i += 2) {
    bytes[i / 2] = parseInt(data.substring(i, i + 2), 16);
  }
  return bytes;
}

export function stripHexPrefix(hex: string): string {
  if (hex.startsWith('0x')) {
    return hex.substring(2);
  }
  return hex;
}

export function isHexPrefixed(hex: string): boolean {
  return hex.startsWith('0x');
}
