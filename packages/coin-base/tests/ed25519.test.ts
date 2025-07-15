import { describe, expect, test } from 'vitest';
import { getEd25519DerivedPrivateKey } from '../src';
import { MnemonicError } from '../src/errors';
import { HibitIdErrorCode } from '../src/errors';

describe('Ed25519 Key Derivation', () => {
  const DERIVING_PATH = "m/44'/223'/0'/0'";
  const VALID_MNEMONIC = 'eight record heavy smile elephant venue spend burst initial cousin casual order';

  test('generate private key from mnemonic', async () => {
    const privateKeyHex = await getEd25519DerivedPrivateKey(VALID_MNEMONIC, DERIVING_PATH, false, 'hex');
    expect(privateKeyHex.includes('00000000')).toBe(false);
  });

  test('should throw MnemonicError for empty mnemonic', async () => {
    await expect(
      getEd25519DerivedPrivateKey('', DERIVING_PATH, false, 'hex')
    ).rejects.toThrow(MnemonicError);
    
    await expect(
      getEd25519DerivedPrivateKey('', DERIVING_PATH, false, 'hex')
    ).rejects.toMatchObject({
      code: HibitIdErrorCode.INVALID_MNEMONIC,
      message: 'Mnemonic is required'
    });
  });

  test('should throw MnemonicError for invalid mnemonic', async () => {
    await expect(
      getEd25519DerivedPrivateKey('invalid words here', DERIVING_PATH, false, 'hex')
    ).rejects.toThrow(MnemonicError);
    
    await expect(
      getEd25519DerivedPrivateKey('invalid words here', DERIVING_PATH, false, 'hex')
    ).rejects.toMatchObject({
      code: HibitIdErrorCode.INVALID_MNEMONIC,
      message: 'Invalid mnemonic phrase'
    });
  });

  test('should throw error for invalid derivation path', async () => {
    await expect(
      getEd25519DerivedPrivateKey(VALID_MNEMONIC, 'invalid/path', false, 'hex')
    ).rejects.toThrow(MnemonicError);
    
    await expect(
      getEd25519DerivedPrivateKey(VALID_MNEMONIC, 'invalid/path', false, 'hex')
    ).rejects.toMatchObject({
      code: HibitIdErrorCode.INVALID_DERIVATION_PATH
    });
  });

  test('should handle whitespace in mnemonic', async () => {
    const mnemonicWithSpaces = '  ' + VALID_MNEMONIC + '  ';
    const privateKeyHex = await getEd25519DerivedPrivateKey(mnemonicWithSpaces, DERIVING_PATH, false, 'hex');
    expect(privateKeyHex).toBeTruthy();
  });

  test('should support both hex and base58 encoding', async () => {
    const hexKey = await getEd25519DerivedPrivateKey(VALID_MNEMONIC, DERIVING_PATH, false, 'hex');
    const base58Key = await getEd25519DerivedPrivateKey(VALID_MNEMONIC, DERIVING_PATH, false, 'base58');
    
    expect(hexKey).toMatch(/^[0-9a-f]+$/i);
    expect(base58Key).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
  });
});

describe('Ed25519 Memory Cleanup Verification', () => {
  const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const TEST_PATH = "m/44'/501'/0'/0'";
  
  test('memory cleanup should not affect returned hex private key', async () => {
    const privateKey1 = await getEd25519DerivedPrivateKey(TEST_MNEMONIC, TEST_PATH, false, 'hex');
    const privateKey2 = await getEd25519DerivedPrivateKey(TEST_MNEMONIC, TEST_PATH, false, 'hex');
    
    expect(privateKey1).toBe(privateKey2);
    expect(privateKey1.length).toBeGreaterThan(0);
    expect(privateKey1).not.toMatch(/^0+$/); // Ensure it's not all zeros
  });

  test('memory cleanup should not affect returned base58 private key', async () => {
    const privateKey1 = await getEd25519DerivedPrivateKey(TEST_MNEMONIC, TEST_PATH, false, 'base58');
    const privateKey2 = await getEd25519DerivedPrivateKey(TEST_MNEMONIC, TEST_PATH, false, 'base58');
    
    expect(privateKey1).toBe(privateKey2);
    expect(privateKey1.length).toBeGreaterThan(0);
    expect(privateKey1).not.toMatch(/^1+$/); // base58 zeros would be all 1s
  });

  test('memory cleanup should not affect private key with public key concatenated', async () => {
    const privateKey1 = await getEd25519DerivedPrivateKey(TEST_MNEMONIC, TEST_PATH, true, 'hex');
    const privateKey2 = await getEd25519DerivedPrivateKey(TEST_MNEMONIC, TEST_PATH, true, 'hex');
    
    expect(privateKey1).toBe(privateKey2);
    expect(privateKey1.length).toBe(128); // 64 bytes = 128 hex chars
    expect(privateKey1).not.toMatch(/^0+$/);
  });
});
