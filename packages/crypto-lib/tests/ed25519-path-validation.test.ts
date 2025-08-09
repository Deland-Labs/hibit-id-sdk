import { expect, test, describe } from 'vitest';
import { isValidPath } from '../src/crypto/ed25519';

describe('Ed25519 derivation path validation', () => {
  test('should validate Ed25519 derivation paths correctly', async () => {
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
});
