import { base } from '@delandlabs/crypto-lib';
import { HDKey } from '@scure/bip32';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const getEcdsaDerivedPrivateKey = async (mnemonic: string, derivationPath: string): Promise<string> => {
  if (!mnemonic || !derivationPath) {
    throw new Error('Invalid parameters: mnemonic and derivationPath are required');
  }
  if (!bip39.validateMnemonic(mnemonic, wordlist)) {
    throw new Error('Invalid mnemonic phrase');
  }
  const masterSeed = await bip39.mnemonicToSeed(mnemonic);
  try {
    const masterKey = HDKey.fromMasterSeed(masterSeed);
    const childKey = masterKey.derive(derivationPath);
    if (!childKey.privateKey) {
      throw new Error('Failed to derive private key');
    }
    const privateKeyHex = base.toHex(childKey.privateKey);
    // Clear sensitive data from memory
    masterSeed.fill(0);
    childKey.privateKey.fill(0);
    return privateKeyHex;
  } catch (error) {
    masterSeed.fill(0);
    throw new Error(`Failed to derive private key: ${error}`);
  }
};

export { getEcdsaDerivedPrivateKey };
