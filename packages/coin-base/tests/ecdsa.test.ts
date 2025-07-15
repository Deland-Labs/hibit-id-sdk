import { describe, expect, test } from 'vitest';
import { getEcdsaDerivedPrivateKey } from '../src';
import { MnemonicError } from '../src/errors';
import { HibitIdErrorCode } from '../src/errors';

describe('ECDSA Key Derivation', () => {
  const DERIVING_PATH = "m/44'/60'/0'/0/0";
  const VALID_MNEMONIC = 'eight record heavy smile elephant venue spend burst initial cousin casual order';

  test('generate private key from mnemonic', async () => {
    const privateKeyHex = await getEcdsaDerivedPrivateKey(VALID_MNEMONIC, DERIVING_PATH);
    expect(privateKeyHex).toMatch(/^[0-9a-f]{64}$/i);
  });

  test('should throw MnemonicError for empty mnemonic', async () => {
    await expect(
      getEcdsaDerivedPrivateKey('', DERIVING_PATH)
    ).rejects.toThrow(MnemonicError);
    
    await expect(
      getEcdsaDerivedPrivateKey('', DERIVING_PATH)
    ).rejects.toMatchObject({
      code: HibitIdErrorCode.INVALID_MNEMONIC,
      message: 'Mnemonic is required'
    });
  });

  test('should throw MnemonicError for invalid mnemonic', async () => {
    await expect(
      getEcdsaDerivedPrivateKey('invalid words here', DERIVING_PATH)
    ).rejects.toThrow(MnemonicError);
    
    await expect(
      getEcdsaDerivedPrivateKey('invalid words here', DERIVING_PATH)
    ).rejects.toMatchObject({
      code: HibitIdErrorCode.INVALID_MNEMONIC,
      message: 'Invalid mnemonic phrase'
    });
  });

  test('should throw error for empty derivation path', async () => {
    await expect(
      getEcdsaDerivedPrivateKey(VALID_MNEMONIC, '')
    ).rejects.toThrow(MnemonicError);
    
    await expect(
      getEcdsaDerivedPrivateKey(VALID_MNEMONIC, '')
    ).rejects.toMatchObject({
      code: HibitIdErrorCode.INVALID_DERIVATION_PATH,
      message: 'Derivation path is required'
    });
  });

  test('should handle whitespace in mnemonic', async () => {
    const mnemonicWithSpaces = '  ' + VALID_MNEMONIC + '  ';
    const privateKeyHex = await getEcdsaDerivedPrivateKey(mnemonicWithSpaces, DERIVING_PATH);
    expect(privateKeyHex).toMatch(/^[0-9a-f]{64}$/i);
  });

  test('should generate different keys for different paths', async () => {
    const key1 = await getEcdsaDerivedPrivateKey(VALID_MNEMONIC, "m/44'/60'/0'/0/0");
    const key2 = await getEcdsaDerivedPrivateKey(VALID_MNEMONIC, "m/44'/60'/0'/0/1");
    
    expect(key1).not.toBe(key2);
  });
});

describe('ECDSA Memory Cleanup Verification', () => {
  const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const TEST_PATH = "m/44'/60'/0'/0/0";
  
  test('memory cleanup should not affect returned private key', async () => {
    const privateKey1 = await getEcdsaDerivedPrivateKey(TEST_MNEMONIC, TEST_PATH);
    const privateKey2 = await getEcdsaDerivedPrivateKey(TEST_MNEMONIC, TEST_PATH);
    
    expect(privateKey1).toBe(privateKey2);
    expect(privateKey1.length).toBe(64); // 32 bytes = 64 hex chars
    expect(privateKey1).not.toMatch(/^0+$/); // Ensure it's not all zeros
  });
});