import { expect, test, vitest } from 'vitest';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { getEcdsaDerivedPrivateKey } from '@delandlabs/coin-base';
import { DERIVING_PATH } from '../src/chain-wallet/defaults';
// set timeout to 60 seconds
vitest.setConfig({
  testTimeout: 60000
});

const privateKeyHex = '73f22e6591b8d004c784352e83fdb61126f70275a34c28430e0512a341084662';
const publicKeyHex =
  '04190ca1014addc5e6e19f18ffa6af682f9e01b00a88afa713d493acc5075e0391c685568f9b1bfd2cea15e9fda1793eb75517a5c946d4be80acd21020052771cd';
const identity = Secp256k1KeyIdentity.fromSecretKey(Buffer.from(privateKeyHex, 'hex'));
expect(Buffer.from(identity.getPublicKey().toRaw()).toString('hex')).toBe(publicKeyHex);
expect(identity.getPrincipal().toText()).toBe('2iudo-gq3ht-c4bvx-chdaa-ksfid-33wt7-2seu2-s35yw-coch4-3k44l-pqe');

test('sign', async () => {
  const message = 'nice';
  const messageBytes = Buffer.from(message, 'utf8');
  const hash = sha256(Buffer.from(messageBytes));
  const signature = await identity.sign(messageBytes);
  expect(Buffer.from(signature).toString('hex')).toBe(
    '3dfe32750ce59b403d60126ad3bcf8ff8766419c96c418d6e546edb5b9e24484434e2ee1f4b78b6a69417ece4646de4ad79ddfc5e1f1694ad2523761ca6aa2b6'
  );

  // verify signature with public key
  const publicKey = identity.getPublicKey();
  expect(secp256k1.verify(Buffer.from(signature), Buffer.from(hash), Buffer.from(publicKey.rawKey))).toBe(true);
});

test('sign wallet request', async () => {
  // sign
  const message = `subject: wallet registration\nchain: 0xdf\nsign_schema: 0x7e4\npub_key: 0x${publicKeyHex}`;
  const messageBytes = Buffer.from(message, 'utf8');
  console.log('messageBytes', Buffer.from(messageBytes).toString('hex'));
  const signature = await identity.sign(messageBytes);
  expect(Buffer.from(signature).toString('hex')).toBe(
    '67c2a4c5c17fb8ff54fdf7f6b6f4fe1f47f9274ad8fb2f924e2527e712bd765966b614426b7d10d597158403a58394bd32307cc501260424d9c473bfac5382f6'
  );

  // verify signature with public key
  const publicKey = identity.getPublicKey();
  const hash = sha256(Buffer.from(messageBytes));
  expect(secp256k1.verify(Buffer.from(signature), Buffer.from(hash), Buffer.from(publicKey.rawKey))).toBe(true);
});

test('generate private key from mnemonic', async () => {
  const mnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';
  const identity = Secp256k1KeyIdentity.fromSeedPhrase(mnemonic);
  const privatekeyBytes = new Uint8Array(identity.getKeyPair().secretKey);
  const privateKeyHex = await getEcdsaDerivedPrivateKey(mnemonic, DERIVING_PATH);
  expect(Buffer.from(privatekeyBytes).toString('hex')).toBe(privateKeyHex);
});
