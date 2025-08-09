import 'reflect-metadata';
import { describe, expect, test } from 'vitest';
import { deriveEd25519PrivateKey, EncodingFormat, base } from '@delandlabs/crypto-lib';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { TON_CONFIG } from '../src/chain-wallet/config';

// Test mnemonic for consistent testing
const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('TON Key Derivation Methods Comparison', () => {
  describe('Ed25519 vs TON Native Key Derivation', () => {
    test('should generate different keys using different derivation methods', async () => {
      // Method 1: Ed25519 derivation from coin-base (standard BIP44 derivation)
      const ed25519PrivateKeyHex = await deriveEd25519PrivateKey(
        testMnemonic,
        TON_CONFIG.DERIVING_PATH,
        true, // includePublicKey
        EncodingFormat.HEX
      );

      // Extract private key (first 64 chars) and public key (remaining 64 chars)
      const ed25519PrivateKey = base.fromHex(ed25519PrivateKeyHex.slice(0, 64));
      const ed25519PublicKey = base.fromHex(ed25519PrivateKeyHex.slice(64));

      // Method 2: TON native mnemonic to private key (TON-specific derivation)
      const tonNativeKeyPair = await mnemonicToPrivateKey(testMnemonic.split(' '));

      console.log('Ed25519 Private Key:', base.toHex(ed25519PrivateKey));
      console.log('Ed25519 Public Key:', base.toHex(ed25519PublicKey));
      console.log('TON Native Private Key:', base.toHex(tonNativeKeyPair.secretKey));
      console.log('TON Native Public Key:', base.toHex(tonNativeKeyPair.publicKey));

      // These methods use different derivation algorithms, so keys should be different
      expect(base.toHex(ed25519PrivateKey)).not.toBe(base.toHex(tonNativeKeyPair.secretKey));
      expect(base.toHex(ed25519PublicKey)).not.toBe(base.toHex(tonNativeKeyPair.publicKey));
    });

    test('should generate different keys for different mnemonic phrases', async () => {
      const testCases = [
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'legal winner thank year wave sausage worth useful legal winner thank yellow',
        'letter advice cage absurd amount doctor acoustic avoid letter advice cage above'
      ];

      const ed25519Results = [];
      const tonNativeResults = [];

      for (const mnemonic of testCases) {
        // Ed25519 method
        const ed25519Result = await deriveEd25519PrivateKey(
          mnemonic,
          TON_CONFIG.DERIVING_PATH,
          true,
          EncodingFormat.HEX
        );

        const ed25519PrivateKey = ed25519Result.slice(0, 64);
        const ed25519PublicKey = ed25519Result.slice(64);

        // TON native method
        const tonNativeKeyPair = await mnemonicToPrivateKey(mnemonic.split(' '));

        ed25519Results.push({ private: ed25519PrivateKey, public: ed25519PublicKey });
        tonNativeResults.push({
          private: base.toHex(tonNativeKeyPair.secretKey),
          public: base.toHex(tonNativeKeyPair.publicKey)
        });

        // Each method should produce different keys than the other method
        expect(ed25519PrivateKey).not.toBe(base.toHex(tonNativeKeyPair.secretKey));
        expect(ed25519PublicKey).not.toBe(base.toHex(tonNativeKeyPair.publicKey));
      }

      // Each mnemonic should produce different keys
      for (let i = 1; i < testCases.length; i++) {
        expect(ed25519Results[i].private).not.toBe(ed25519Results[0].private);
        expect(tonNativeResults[i].private).not.toBe(tonNativeResults[0].private);
      }
    });

    test('should handle ed25519 without public key correctly', async () => {
      // Test without public key inclusion
      const ed25519PrivateKeyOnly = await deriveEd25519PrivateKey(
        testMnemonic,
        TON_CONFIG.DERIVING_PATH,
        false, // don't include public key
        EncodingFormat.HEX
      );

      // Should be 64 characters (32 bytes) for private key only
      expect(ed25519PrivateKeyOnly.length).toBe(64);

      // TON native method
      const tonNativeKeyPair = await mnemonicToPrivateKey(testMnemonic.split(' '));

      // Different derivation methods, should produce different keys
      expect(ed25519PrivateKeyOnly).not.toBe(base.toHex(tonNativeKeyPair.secretKey));
    });

    test('should verify key format differences', async () => {
      const ed25519Result = await deriveEd25519PrivateKey(
        testMnemonic,
        TON_CONFIG.DERIVING_PATH,
        true,
        EncodingFormat.HEX
      );

      const tonNativeKeyPair = await mnemonicToPrivateKey(testMnemonic.split(' '));

      // Verify lengths
      expect(ed25519Result.length).toBe(128); // 64 chars private + 64 chars public
      expect(tonNativeKeyPair.secretKey.length).toBeGreaterThanOrEqual(32); // At least 32 bytes, but could be 64
      expect(tonNativeKeyPair.publicKey.length).toBeGreaterThanOrEqual(32); // At least 32 bytes

      // Verify hex format
      expect(ed25519Result).toMatch(/^[0-9a-f]{128}$/);
      expect(base.toHex(tonNativeKeyPair.secretKey)).toMatch(/^[0-9a-f]+$/);
      expect(base.toHex(tonNativeKeyPair.publicKey)).toMatch(/^[0-9a-f]+$/);
    });

    test('should generate deterministic keys', async () => {
      const runs = 3;
      const results = [];

      for (let i = 0; i < runs; i++) {
        // Ed25519 method
        const ed25519Result = await deriveEd25519PrivateKey(
          testMnemonic,
          TON_CONFIG.DERIVING_PATH,
          true,
          EncodingFormat.HEX
        );

        // TON native method
        const tonNativeKeyPair = await mnemonicToPrivateKey(testMnemonic.split(' '));

        results.push({
          ed25519: ed25519Result,
          tonPrivate: base.toHex(tonNativeKeyPair.secretKey),
          tonPublic: base.toHex(tonNativeKeyPair.publicKey)
        });
      }

      // All runs should produce identical results
      for (let i = 1; i < runs; i++) {
        expect(results[i].ed25519).toBe(results[0].ed25519);
        expect(results[i].tonPrivate).toBe(results[0].tonPrivate);
        expect(results[i].tonPublic).toBe(results[0].tonPublic);
      }
    });

    test('should handle different derivation paths consistently', async () => {
      const derivationPaths = [
        "m/44'/607'/0'", // TON standard path
        "m/44'/607'/1'", // Alternative path
        "m/44'/607'/0'/0'" // Extended path
      ];

      for (const path of derivationPaths) {
        const ed25519Result = await deriveEd25519PrivateKey(testMnemonic, path, true, EncodingFormat.HEX);

        // For TON native, we use the standard mnemonic to key conversion
        // which doesn't use derivation paths in the same way
        const tonNativeKeyPair = await mnemonicToPrivateKey(testMnemonic.split(' '));

        // The keys should be valid hex strings
        expect(ed25519Result).toMatch(/^[0-9a-f]{128}$/);
        expect(base.toHex(tonNativeKeyPair.secretKey)).toMatch(/^[0-9a-f]+$/);
        expect(base.toHex(tonNativeKeyPair.publicKey)).toMatch(/^[0-9a-f]+$/);

        // Ed25519 and TON native use different derivation methods
        const ed25519Private = ed25519Result.slice(0, 64);
        const ed25519Public = ed25519Result.slice(64);

        expect(ed25519Private).not.toBe(base.toHex(tonNativeKeyPair.secretKey));
        expect(ed25519Public).not.toBe(base.toHex(tonNativeKeyPair.publicKey));
      }
    });

    test('should handle edge case mnemonics', async () => {
      const edgeCaseMnemonics = [
        // Valid edge case mnemonics with correct checksums
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'legal winner thank year wave sausage worth useful legal winner thank yellow',
        'letter advice cage absurd amount doctor acoustic avoid letter advice cage above'
      ];

      for (const mnemonic of edgeCaseMnemonics) {
        // These are all valid mnemonics, they should not throw
        const ed25519Result = await deriveEd25519PrivateKey(
          mnemonic,
          TON_CONFIG.DERIVING_PATH,
          true,
          EncodingFormat.HEX
        );

        const tonNativeKeyPair = await mnemonicToPrivateKey(mnemonic.split(' '));

        // Should produce valid results
        expect(ed25519Result.length).toBe(128);
        expect(tonNativeKeyPair.secretKey.length).toBeGreaterThanOrEqual(32);
        expect(tonNativeKeyPair.publicKey.length).toBeGreaterThanOrEqual(32);

        // Keys should be valid hex strings
        expect(ed25519Result).toMatch(/^[0-9a-f]{128}$/);
        expect(base.toHex(tonNativeKeyPair.secretKey)).toMatch(/^[0-9a-f]+$/);
        expect(base.toHex(tonNativeKeyPair.publicKey)).toMatch(/^[0-9a-f]+$/);
      }
    });
  });

  describe('Base58 Encoding Differences', () => {
    test('should generate different private keys in Base58 format due to different derivation', async () => {
      const ed25519Base58 = await deriveEd25519PrivateKey(
        testMnemonic,
        TON_CONFIG.DERIVING_PATH,
        false, // private key only
        EncodingFormat.BASE58
      );

      const tonNativeKeyPair = await mnemonicToPrivateKey(testMnemonic.split(' '));

      // Convert TON native key to Base58 for comparison
      const base58 = await import('@delandlabs/crypto-lib').then((m) => m.base);
      const tonNativeBase58 = base58.base58.encode(tonNativeKeyPair.secretKey);

      // Different derivation methods produce different keys, even in Base58 format
      expect(ed25519Base58).not.toBe(tonNativeBase58);
    });
  });
});
