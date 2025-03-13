import { expect, test, vitest } from 'vitest';
import { getEd25519DerivedPrivateKey } from '@delandlabs/coin-base';
import { DERIVING_PATH } from '../src/chain-wallet/defaults';
import { mnemonicToPrivateKey } from '@ton/crypto';
// set timeout to 60 seconds
vitest.setConfig({
  testTimeout: 60000
});

test('generate private key from mnemonic', async () => {
  const mnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';
  const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
  const privatekeyBytes = new Uint8Array(keyPair.secretKey);
  const privateKeyHex = await getEd25519DerivedPrivateKey(mnemonic, DERIVING_PATH, true, 'hex');
  // Ton can not use the same function to generate private key from mnemonic
  expect(Buffer.from(privatekeyBytes).toString('hex')).toBe(privateKeyHex);
});
