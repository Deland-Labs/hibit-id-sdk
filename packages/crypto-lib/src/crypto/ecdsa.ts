import * as base from '../base';
import { HDKey } from '@scure/bip32';
import * as bip39 from '@scure/bip39';

import { clearSensitiveArrays } from '../utils';

/**
 * Derives an ECDSA private key from a mnemonic phrase
 * @param mnemonic - BIP39 mnemonic phrase
 * @param derivationPath - Hierarchical deterministic derivation path (e.g., "m/44'/60'/0'/0/0")
 * @returns The hex-encoded private key
 * @security The returned string contains sensitive cryptographic material.
 *           Callers must securely handle and clear this data when no longer needed.
 *           Binary intermediate data is cleared automatically.
 */
const deriveEcdsaPrivateKey = async (mnemonic: string, derivationPath: string): Promise<string> => {
  // Mnemonic validation is handled by MnemonicUtil.validateMnemonic() before calling this function
  if (!derivationPath?.trim()) {
    throw new Error('Derivation path is required');
  }
  const trimmedMnemonic = mnemonic.trim();
  const masterSeed = await bip39.mnemonicToSeed(trimmedMnemonic);
  try {
    const masterKey = HDKey.fromMasterSeed(masterSeed);
    const childKey = masterKey.derive(derivationPath);
    if (!childKey.privateKey) {
      throw new Error(`Failed to derive private key for path: ${derivationPath}`);
    }
    const hexEncodedPrivateKey = base.toHex(childKey.privateKey);

    // Clear sensitive binary data from memory
    // Note: The returned hex string still contains the private key data
    // Callers are responsible for securely handling/clearing the returned string
    clearSensitiveArrays(masterSeed, childKey.privateKey);

    return hexEncodedPrivateKey;
  } catch (error) {
    clearSensitiveArrays(masterSeed);
    throw new Error(`ECDSA key derivation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export { deriveEcdsaPrivateKey };
