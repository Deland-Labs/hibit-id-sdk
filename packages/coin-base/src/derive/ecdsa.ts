import { base } from '@delandlabs/crypto-lib';
import { HDKey } from '@scure/bip32';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { MnemonicError, HibitIdErrorCode } from '../errors';

const getEcdsaDerivedPrivateKey = async (mnemonic: string, derivationPath: string): Promise<string> => {
  if (!mnemonic?.trim()) {
    throw new MnemonicError(
      HibitIdErrorCode.INVALID_MNEMONIC,
      'Mnemonic is required'
    );
  }
  if (!derivationPath?.trim()) {
    throw new MnemonicError(
      HibitIdErrorCode.INVALID_DERIVATION_PATH,
      'Derivation path is required'
    );
  }
  const trimmedMnemonic = mnemonic.trim();
  if (!bip39.validateMnemonic(trimmedMnemonic, wordlist)) {
    throw new MnemonicError(
      HibitIdErrorCode.INVALID_MNEMONIC,
      'Invalid mnemonic phrase'
    );
  }
  const masterSeed = await bip39.mnemonicToSeed(trimmedMnemonic);
  try {
    const masterKey = HDKey.fromMasterSeed(masterSeed);
    const childKey = masterKey.derive(derivationPath);
    if (!childKey.privateKey) {
      throw new MnemonicError(
        HibitIdErrorCode.MNEMONIC_DERIVATION_FAILED,
        `Failed to derive private key for path: ${derivationPath}`
      );
    }
    const privateKeyHex = base.toHex(childKey.privateKey);
    // Clear sensitive data from memory
    masterSeed.fill(0);
    childKey.privateKey.fill(0);
    return privateKeyHex;
  } catch (error) {
    masterSeed.fill(0);
    if (error instanceof MnemonicError) {
      throw error;
    }
    throw new MnemonicError(
      HibitIdErrorCode.MNEMONIC_DERIVATION_FAILED,
      `ECDSA key derivation failed: ${error.message}`,
      { derivationPath }
    );
  }
};

export { getEcdsaDerivedPrivateKey };
