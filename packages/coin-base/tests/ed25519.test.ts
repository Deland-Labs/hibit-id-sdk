import { expect, test } from 'vitest';
import { getEd25519DerivedPrivateKey } from '../src';

test('generate private key from mnemonic', async () => {
  const DERIVING_PATH = "m/44'/223'/0'/0'";
  const mnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';
  const privateKeyHex = await getEd25519DerivedPrivateKey(mnemonic, DERIVING_PATH, false, 'hex');

  expect(privateKeyHex.includes('00000000')).toBe(false);
});
