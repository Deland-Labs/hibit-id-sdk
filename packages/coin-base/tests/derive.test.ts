import { expect, test } from 'vitest';
import { isValidPath } from '../src/derive/ed25519';

test('validate derivation path', async () => {
  const ed5519Path = `m/44'/195'/0'/0'`;
  expect(isValidPath(ed5519Path)).equals(true);
});
