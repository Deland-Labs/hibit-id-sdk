import { Input } from '@noble/hashes/utils';
import { hmac } from '@noble/hashes/hmac';
import { sha256, sha512 } from '@noble/hashes/sha2';

export function hmacSHA256(key: Input, buffer: Input): Uint8Array {
  return hmac(sha256, key, buffer);
}

export function hmacSHA512(key: Input, buffer: Input): Uint8Array {
  return hmac(sha512, key, buffer);
}
