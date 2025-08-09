import * as base from '../base';
// Using modern Uint8Array instead of Buffer
import * as ed25519 from '@noble/ed25519';
import * as bip39 from '@scure/bip39';

import { EncodingFormat } from './types';
import { clearSensitiveArrays } from '../utils';

// Constants for Ed25519 key generation and derivation
/**
 * BIP32 hardened derivation offset (2^31)
 * Used to derive hardened keys in hierarchical deterministic wallets
 */
const BIP32_HARDENED_OFFSET = 0x80000000;

/**
 * HMAC key for Ed25519 seed generation as per SLIP-0010
 */
const ED25519_SEED_KEY = 'ed25519 seed';

ed25519.etc.sha512Sync = base.sha512;

const pathRegex = /^m(\/[0-9]+')+$/;

/**
 * Removes the hardened marker (apostrophe) from a path segment
 * @param pathSegment - A segment of a derivation path (e.g., "44'")
 * @returns The segment without the hardened marker (e.g., "44")
 */
const removeHardenedMarker = (pathSegment: string): string => pathSegment.replace("'", '');

/**
 * Extended key type containing both the key and chain code for HD derivation
 */
type ExtendedKey = {
  key: Uint8Array;
  chainCode: Uint8Array;
};

/**
 * Derives the master key from a seed using HMAC-SHA512
 * This follows the Ed25519 HD key derivation specification
 * @param seed - The seed bytes (typically from a mnemonic)
 * @returns The master extended key containing the private key and chain code
 */
function getMasterKeyFromSeed(seed: Uint8Array): ExtendedKey {
  const hmacResult = base.hmacSHA512(ED25519_SEED_KEY, seed);
  const privateKey = hmacResult.slice(0, 32);
  const chainCode = hmacResult.slice(32);
  // Clear sensitive data
  clearSensitiveArrays(hmacResult);
  return {
    key: privateKey,
    chainCode: chainCode
  };
}

/**
 * Derives a child private key from a parent key using hardened derivation
 * This implements the child key derivation function for Ed25519 HD wallets
 * @param param0 - The parent extended key containing key and chain code
 * @param index - The child key index (will be offset by BIP32_HARDENED_OFFSET)
 * @returns The derived child extended key
 */
function childKeyDerivationPrivate({ key, chainCode }: ExtendedKey, index: number): ExtendedKey {
  // Create index bytes (big-endian 32-bit)
  const indexBytes = new Uint8Array(4);
  const view = new DataView(indexBytes.buffer);
  view.setUint32(0, index, false); // false = big-endian

  // Create data for HMAC: [0x00, key, index]
  const data = base.concatBytes(new Uint8Array([0]), key, indexBytes);
  const hmacResult = base.hmacSHA512(chainCode, data);

  const childKey = hmacResult.slice(0, 32);
  const childChainCode = hmacResult.slice(32);
  // Clear sensitive data
  clearSensitiveArrays(hmacResult, data, indexBytes);
  return {
    key: childKey,
    chainCode: childChainCode
  };
}

/**
 * Validates if a string is a valid BIP32 derivation path
 * Valid paths must start with 'm' and contain only hardened indices (with apostrophes)
 * @param path - The derivation path to validate (e.g., "m/44'/501'/0'/0'")
 * @returns True if the path is valid, false otherwise
 */
const isValidPath = (path: string): boolean => {
  if (!pathRegex.test(path)) {
    return false;
  }
  return !path
    .split('/')
    .slice(1)
    .map(removeHardenedMarker)
    .some((segment) => Number.isNaN(Number(segment)));
};

/**
 * Derives an extended key from a seed following a BIP32-like derivation path
 * This function walks the derivation path from master to the final child key
 * @param path - The derivation path (e.g., "m/44'/501'/0'/0'")
 * @param seed - The seed bytes to derive from
 * @param offset - The hardened key offset (defaults to BIP32_HARDENED_OFFSET)
 * @returns The final extended key at the end of the derivation path
 * @throws {MnemonicError} If the path is invalid
 */
function derivePath(path: string, seed: Uint8Array, offset = BIP32_HARDENED_OFFSET): ExtendedKey {
  if (!isValidPath(path)) {
    throw new Error(`Invalid derivation path: ${path}`);
  }

  const { key, chainCode } = getMasterKeyFromSeed(seed);
  const segments = path
    .split('/')
    .slice(1)
    .map(removeHardenedMarker)
    .map((segment) => parseInt(segment, 10));

  return segments.reduce((parentKeys, segment) => childKeyDerivationPrivate(parentKeys, segment + offset), {
    key,
    chainCode
  });
}

/**
 * Derives an Ed25519 private key from a mnemonic phrase
 * Validates the mnemonic before deriving the key
 * @param mnemonic - BIP39 mnemonic phrase
 * @param derivationPath - Hierarchical deterministic derivation path (e.g., "m/44'/501'/0'/0'")
 * @param includePublicKey - Whether to concatenate the public key to the private key (e.g. Solana uses 64-byte keys)
 * @param encodingFormat - Output encoding format (hex or base58)
 * @returns The encoded derived private key
 */
async function deriveEd25519PrivateKey(
  mnemonic: string,
  derivationPath: string,
  includePublicKey: boolean,
  encodingFormat: EncodingFormat
): Promise<string> {
  // Mnemonic validation is handled by MnemonicUtil.validateMnemonic() before calling this function
  const trimmedMnemonic = mnemonic.trim();

  if (!Object.values(EncodingFormat).includes(encodingFormat)) {
    throw new Error(`Invalid encoding format: ${encodingFormat}`);
  }

  let seed: Uint8Array | null = null;
  let derivedSeed: Uint8Array | null = null;
  let publicKey: Uint8Array | null = null;

  try {
    // Generate seed
    seed = await bip39.mnemonicToSeed(trimmedMnemonic);

    // Derive key
    const derived = derivePath(derivationPath, seed);
    derivedSeed = derived.key;

    // Get public key
    publicKey = ed25519.getPublicKey(base.toHex(derivedSeed));
    const privateKey = includePublicKey ? base.concatBytes(derivedSeed, publicKey) : derivedSeed;

    // Encode result
    return encodingFormat === EncodingFormat.BASE58 ? base.toBase58(privateKey) : base.toHex(privateKey);
  } catch (error) {
    throw new Error(`Ed25519 key derivation failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Clear sensitive data - always clear sensitive material immediately
    // Strategy: Clear intermediate data, but not data that's part of the return value
    clearSensitiveArrays(seed);

    // Create separate cleanup strategy based on includePublicKey flag
    if (includePublicKey) {
      // When includePublicKey is true, the returned privateKey contains both derivedSeed and publicKey
      // So we cannot clear these arrays as they are part of the returned result
      // The caller is responsible for clearing the returned array when done
    } else {
      // When includePublicKey is false, derivedSeed and publicKey are separate from the returned result
      clearSensitiveArrays(derivedSeed, publicKey);
    }
  }
}

export { isValidPath, deriveEd25519PrivateKey };
