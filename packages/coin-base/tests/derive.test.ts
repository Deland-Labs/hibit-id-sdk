import { expect, test } from 'vitest';
import { isValidPath } from '../src/derive/ed25519';

test('validate derivation path', async () => {
  const ed5519Path = `m/44'/195'/0'/0'`;
  expect(isValidPath(ed5519Path)).equals(true);

  // Invalid paths
  expect(isValidPath('')).equals(false);
  expect(isValidPath('invalid')).equals(false);
  expect(isValidPath('m/44/195/0/0')).equals(false); // missing hardened indices

  // Different valid formats
  expect(isValidPath(`m/44'/0'/0'/0'`)).equals(true);
  expect(isValidPath(`m/44'/195'/0'/0'/0'`)).equals(true);
});
