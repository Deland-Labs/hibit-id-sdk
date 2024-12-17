import { base, bip32, bip39 } from '@delandlabs/crypto-lib';

const getEcdsaDerivedPrivateKey = async (menmonic: string, derivationPath: string): Promise<string> => {
  const masterSeed = await bip39.mnemonicToSeed(menmonic);
  let childKey = bip32.fromSeed(masterSeed).derivePath(derivationPath);
  if (childKey.privateKey) {
    return base.toHex(childKey.privateKey);
  } else {
    throw new Error('generate private key error');
  }
};

export { getEcdsaDerivedPrivateKey };
