import { base } from '@delandlabs/crypto-lib';
import * as ed25519 from '@noble/ed25519';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { MnemonicError, HibitIdErrorCode } from '../errors';

ed25519.etc.sha512Sync = base.sha512;
/**
 * WARNING: This function is for testing purposes only.
 * DO NOT use this function for production signing operations.
 * @param privateKey - The private key to test
 * @returns boolean - Whether the test signature is valid
 */
export function ed25519SignTest(privateKey: Uint8Array) {
  const testMsg = base.randomBytes(32);
  const msgHash = base.sha256(testMsg);
  const publicKey = ed25519.getPublicKey(base.toHex(privateKey));
  const signature = ed25519.sign(msgHash, privateKey);
  const result = ed25519.verify(msgHash, signature, publicKey);
  // Clear sensitive data
  testMsg.fill(0);
  msgHash.fill(0);
  publicKey.fill(0);
  signature.fill(0);
  return result;
}

/**
 * ed25519 Gets random private key
 *
 * @param concatPub - whether to add 32bytes public key (e.g. solana private key is 64bytes)
 * @param encode - private key encoding format, supporting hex and base58. For example, solana requires a base58 encoded private key
 * @returns string - Private key
 */
function getRandomEd25519PrivateKey(concatPub: boolean, encode: 'hex' | 'base58'): string {
  const MAX_ATTEMPTS = 100;
  let attempts = 0;
  while (true) {
    if (attempts++ >= MAX_ATTEMPTS) {
      throw new Error('Failed to generate valid private key after maximum attempts');
    }
    const randBytes = ed25519.utils.randomPrivateKey();

    if (ed25519SignTest(randBytes)) {
      const publicKey = ed25519.getPublicKey(base.toHex(randBytes));
      const privateKey: Uint8Array = concatPub ? base.concatBytes(randBytes, publicKey) : randBytes;
      // Clear sensitive data
      randBytes.fill(0);
      if (concatPub) publicKey.fill(0);
      return encode === 'base58' ? base.toBase58(privateKey) : base.toHex(privateKey);
    }
  }
}

const pathRegex = /^m(\/[0-9]+')+$/;
const replaceDerive = (val: string): string => val.replace("'", '');
const HARDENED_OFFSET = 0x80000000;

type Keys = {
  key: Uint8Array;
  chainCode: Uint8Array;
};

function getMasterKeyFromSeed(seed: Uint8Array) {
  const I = Uint8Array.from(base.hmacSHA512('ed25519 seed', seed));
  const IL = I.slice(0, 32);
  const IR = I.slice(32);
  // Clear sensitive data
  I.fill(0);
  return {
    key: IL,
    chainCode: IR
  };
}

function CKDPriv({ key, chainCode }: Keys, index: number): Keys {
  const indexBuffer = Buffer.allocUnsafe(4);
  indexBuffer.writeUInt32BE(index, 0);

  const data = Buffer.concat([Buffer.alloc(1, 0), key, indexBuffer]);
  const I = Uint8Array.from(base.hmacSHA512(chainCode, data));
  const IL = I.slice(0, 32);
  const IR = I.slice(32);
  // Clear sensitive data
  I.fill(0);
  data.fill(0);
  indexBuffer.fill(0);
  return {
    key: IL,
    chainCode: IR
  };
}

const isValidPath = (path: string): boolean => {
  if (!pathRegex.test(path)) {
    return false;
  }
  return !path
    .split('/')
    .slice(1)
    .map(replaceDerive)
    .some(Number.isNaN as any /* ts T_T*/);
};

function derivePath(path: string, seed: Uint8Array, offset = HARDENED_OFFSET): Keys {
  if (!isValidPath(path)) {
    throw new MnemonicError(HibitIdErrorCode.INVALID_DERIVATION_PATH, `Invalid derivation path: ${path}`);
  }

  const { key, chainCode } = getMasterKeyFromSeed(seed);
  const segments = path
    .split('/')
    .slice(1)
    .map(replaceDerive)
    .map((el) => parseInt(el, 10));

  return segments.reduce((parentKeys, segment) => CKDPriv(parentKeys, segment + offset), { key, chainCode });
}

/**
 * ed25519 Gets the derived private key
 *
 * @param mnemonic - mnemonic
 * @param hdPath - derivation path
 * @param concatPub - whether to add 32bytes public key (e.g. solana private key is 64bytes)
 * @param encode - private key encoding format, supporting hex and base58. For example, solana requires a base58 encoded private key
 * @returns string - Private key
 */
async function getEd25519DerivedPrivateKey(
  mnemonic: string,
  hdPath: string,
  concatPub: boolean,
  encode: 'hex' | 'base58'
): Promise<string> {
  // Parameter validation
  if (!mnemonic?.trim()) {
    throw new MnemonicError(HibitIdErrorCode.INVALID_MNEMONIC, 'Mnemonic is required');
  }

  // Validate mnemonic
  const trimmedMnemonic = mnemonic.trim();
  if (!bip39.validateMnemonic(trimmedMnemonic, wordlist)) {
    throw new MnemonicError(HibitIdErrorCode.INVALID_MNEMONIC, 'Invalid mnemonic phrase');
  }

  if (!['hex', 'base58'].includes(encode)) {
    throw new Error('Invalid encoding format');
  }

  let seed: Uint8Array | null = null;
  let derivedSeed: Uint8Array | null = null;
  let publicKey: Uint8Array | null = null;

  try {
    // Generate seed
    seed = await bip39.mnemonicToSeed(trimmedMnemonic);

    // Derive key
    const derived = derivePath(hdPath, seed);
    derivedSeed = derived.key;

    // Get public key
    publicKey = ed25519.getPublicKey(base.toHex(derivedSeed));
    const privateKey = concatPub ? base.concatBytes(derivedSeed, publicKey) : derivedSeed;

    // Encode result
    return encode === 'base58' ? base.toBase58(privateKey) : base.toHex(privateKey);
  } catch (error) {
    if (error instanceof MnemonicError) {
      throw error;
    }
    throw new MnemonicError(
      HibitIdErrorCode.MNEMONIC_DERIVATION_FAILED,
      `Ed25519 key derivation failed: ${error.message}`,
      { hdPath }
    );
  } finally {
    // Clear sensitive data
    if (seed) seed.fill(0);
    if (derivedSeed && !concatPub) derivedSeed.fill(0);
    if (publicKey && !concatPub) publicKey.fill(0);
  }
}

export { isValidPath, getEd25519DerivedPrivateKey, getRandomEd25519PrivateKey };
