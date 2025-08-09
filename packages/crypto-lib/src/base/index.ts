export * from './base58';
export * from './base58Check';
export * from './bech32';
export * from './hex';
export * from './base64';
export * from './hash';
export * from './hmac';
export * from './utf8';
export * from './precondtion';
export * from './helper';

export * from '@scure/base';
export * from '@noble/hashes/sha2';
export * from '@noble/hashes/hmac';
export * from '@noble/hashes/sha3';
export * from '@noble/hashes/pbkdf2';
export * from '@noble/hashes/scrypt';
export * from '@noble/hashes/blake3';
export { concatBytes } from '@noble/hashes/utils';

export function randomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(array);
  } else if (typeof global !== 'undefined' && global.crypto) {
    global.crypto.getRandomValues(array);
  } else if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    throw new Error('No secure random number generator available');
  }
  return array;
}
