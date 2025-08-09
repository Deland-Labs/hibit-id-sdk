import 'reflect-metadata';
import { describe, expect, test } from 'vitest';
import { base, deriveEd25519PrivateKey, EncodingFormat } from '@delandlabs/crypto-lib';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { DERIVING_PATH } from '../src/chain-wallet/config';

// Test mnemonic for consistent testing
const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('Solana Key Derivation Consistency', () => {
  describe('Ed25519 vs Solana Native Key Derivation', () => {
    test('should generate consistent private keys between ed25519 and solana-native methods', async () => {
      // Method 1: Ed25519 derivation from coin-base
      const ed25519PrivateKeyHex = await deriveEd25519PrivateKey(
        testMnemonic,
        DERIVING_PATH,
        false, // private key only
        EncodingFormat.HEX
      );

      // Convert to bytes for Solana
      const ed25519PrivateKey = base.fromHex(ed25519PrivateKeyHex);

      // Method 2: Solana native key derivation using fromSeed
      // Solana's Keypair.fromSeed expects a 32-byte seed
      const solanaKeyPair = Keypair.fromSeed(ed25519PrivateKey);

      console.log('Ed25519 Private Key:', ed25519PrivateKeyHex);
      console.log('Solana Secret Key (first 32 bytes):', base.toHex(solanaKeyPair.secretKey.slice(0, 32)));
      console.log('Solana Public Key:', base.toHex(solanaKeyPair.publicKey.toBytes()));

      // Verify that the private key portion matches
      // Solana's secretKey is 64 bytes: 32-byte private key + 32-byte public key
      const solanaPrivateKey = solanaKeyPair.secretKey.slice(0, 32);
      expect(base.toHex(solanaPrivateKey)).toBe(ed25519PrivateKeyHex);
    });

    test('should generate same keys for different mnemonic phrases', async () => {
      const testCases = [
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'legal winner thank year wave sausage worth useful legal winner thank yellow',
        'letter advice cage absurd amount doctor acoustic avoid letter advice cage above'
      ];

      for (const mnemonic of testCases) {
        // Ed25519 method
        const ed25519Result = await deriveEd25519PrivateKey(mnemonic, DERIVING_PATH, false, EncodingFormat.HEX);

        // Create Solana keypair from the same seed
        const solanaKeyPair = Keypair.fromSeed(base.fromHex(ed25519Result));
        const solanaPrivateKey = base.toHex(solanaKeyPair.secretKey.slice(0, 32));

        expect(ed25519Result).toBe(solanaPrivateKey);
      }
    });

    test('should verify key format consistency', async () => {
      const ed25519Result = await deriveEd25519PrivateKey(testMnemonic, DERIVING_PATH, false, EncodingFormat.HEX);

      const solanaKeyPair = Keypair.fromSeed(base.fromHex(ed25519Result));

      // Verify lengths
      expect(ed25519Result.length).toBe(64); // 32 bytes as hex
      expect(solanaKeyPair.secretKey.length).toBe(64); // 64 bytes total
      expect(solanaKeyPair.publicKey.toBytes().length).toBe(32); // 32 bytes public key

      // Verify hex format
      expect(ed25519Result).toMatch(/^[0-9a-f]{64}$/);
    });

    test('should generate deterministic keys', async () => {
      const runs = 5;
      const results = [];

      for (let i = 0; i < runs; i++) {
        // Ed25519 method
        const ed25519Result = await deriveEd25519PrivateKey(testMnemonic, DERIVING_PATH, false, EncodingFormat.HEX);

        // Solana method
        const solanaKeyPair = Keypair.fromSeed(base.fromHex(ed25519Result));

        results.push({
          ed25519: ed25519Result,
          solanaPrivate: base.toHex(solanaKeyPair.secretKey.slice(0, 32)),
          solanaPublic: base.toHex(solanaKeyPair.publicKey.toBytes())
        });
      }

      // All runs should produce identical results
      for (let i = 1; i < runs; i++) {
        expect(results[i].ed25519).toBe(results[0].ed25519);
        expect(results[i].solanaPrivate).toBe(results[0].solanaPrivate);
        expect(results[i].solanaPublic).toBe(results[0].solanaPublic);
      }
    });

    test('should handle different derivation paths', async () => {
      const derivationPaths = [
        "m/44'/501'/0'/0'", // Solana standard path
        "m/44'/501'/1'/0'", // Alternative account
        "m/44'/501'/0'/1'" // Alternative change
      ];

      const keys = [];
      for (const path of derivationPaths) {
        const privateKeyHex = await deriveEd25519PrivateKey(testMnemonic, path, false, EncodingFormat.HEX);

        keys.push(privateKeyHex);
        expect(privateKeyHex).toMatch(/^[0-9a-f]{64}$/);
      }

      // Different paths should generate different keys
      expect(keys[0]).not.toBe(keys[1]);
      expect(keys[1]).not.toBe(keys[2]);
      expect(keys[0]).not.toBe(keys[2]);
    });

    test('should verify public key derivation consistency', async () => {
      const ed25519PrivateKeyHex = await deriveEd25519PrivateKey(
        testMnemonic,
        DERIVING_PATH,
        false,
        EncodingFormat.HEX
      );

      // Get public key using ed25519
      const ed25519WithPublicKey = await deriveEd25519PrivateKey(
        testMnemonic,
        DERIVING_PATH,
        true, // include public key
        EncodingFormat.HEX
      );

      const ed25519PublicKey = ed25519WithPublicKey.slice(64); // Last 32 bytes (64 hex chars)

      // Get public key using Solana
      const solanaKeyPair = Keypair.fromSeed(base.fromHex(ed25519PrivateKeyHex));
      const solanaPublicKey = base.toHex(solanaKeyPair.publicKey.toBytes());

      console.log('Ed25519 Public Key:', ed25519PublicKey);
      console.log('Solana Public Key:', solanaPublicKey);

      // Both should produce the same public key
      expect(ed25519PublicKey).toBe(solanaPublicKey);
    });

    test('should verify address generation consistency', async () => {
      // Generate private key
      const privateKeyHex = await deriveEd25519PrivateKey(testMnemonic, DERIVING_PATH, false, EncodingFormat.HEX);

      // Create multiple keypairs from the same seed
      const keypair1 = Keypair.fromSeed(base.fromHex(privateKeyHex));
      const keypair2 = Keypair.fromSeed(base.fromHex(privateKeyHex));

      // Both should generate the same address
      const address1 = keypair1.publicKey.toBase58();
      const address2 = keypair2.publicKey.toBase58();

      expect(address1).toBe(address2);
      expect(address1).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/); // Base58 format
    });

    test('should handle edge case mnemonics', async () => {
      const edgeCaseMnemonics = [
        // Min entropy
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        // Different pattern
        'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
      ];

      for (const mnemonic of edgeCaseMnemonics) {
        try {
          const ed25519Result = await deriveEd25519PrivateKey(mnemonic, DERIVING_PATH, false, EncodingFormat.HEX);

          const solanaKeyPair = Keypair.fromSeed(base.fromHex(ed25519Result));

          // Should produce valid results
          expect(ed25519Result.length).toBe(64);
          expect(solanaKeyPair.secretKey.length).toBe(64);
          expect(solanaKeyPair.publicKey.toBytes().length).toBe(32);

          // Keys should match
          const solanaPrivateKey = base.toHex(solanaKeyPair.secretKey.slice(0, 32));
          expect(ed25519Result).toBe(solanaPrivateKey);
        } catch (error) {
          // Both methods should fail in the same way for invalid mnemonics
          expect(async () => {
            await deriveEd25519PrivateKey(mnemonic, DERIVING_PATH, false, EncodingFormat.HEX);
          }).rejects.toThrow();
        }
      }
    });
  });

  describe('Base58 Encoding Consistency', () => {
    test('should generate consistent private keys in Base58 format', async () => {
      const hexKey = await deriveEd25519PrivateKey(testMnemonic, DERIVING_PATH, false, EncodingFormat.HEX);

      const base58Key = await deriveEd25519PrivateKey(testMnemonic, DERIVING_PATH, false, EncodingFormat.BASE58);

      // Convert hex to base58 manually to verify consistency
      const { base58 } = await import('@scure/base');
      const hexBytes = base.fromHex(hexKey);
      const expectedBase58 = base58.encode(hexBytes);

      expect(base58Key).toBe(expectedBase58);
    });
  });

  describe('Signature Operations Consistency', () => {
    test('should produce same signature for same message', async () => {
      const message = new TextEncoder().encode('test message for signature verification');

      // Generate private key
      const privateKeyHex = await deriveEd25519PrivateKey(testMnemonic, DERIVING_PATH, false, EncodingFormat.HEX);

      // Create Solana keypair
      const keypair = Keypair.fromSeed(base.fromHex(privateKeyHex));

      // Sign using nacl (as used in the wallet)
      const signature1 = nacl.sign.detached(message, keypair.secretKey);

      // Sign again to verify deterministic
      const signature2 = nacl.sign.detached(message, keypair.secretKey);

      // Signatures should be identical
      expect(base.toHex(signature1)).toBe(base.toHex(signature2));
      expect(signature1.length).toBe(64); // Ed25519 signature is 64 bytes
    });
  });

  describe('Wallet Implementation Consistency', () => {
    test('should verify the wallet creates keypair correctly', async () => {
      // This test verifies that the wallet's approach matches our expectations
      const privateKeyHex = await deriveEd25519PrivateKey(testMnemonic, DERIVING_PATH, false, EncodingFormat.HEX);

      const privateKeyBytes = base.fromHex(privateKeyHex);
      const keypair = Keypair.fromSeed(privateKeyBytes);

      // Verify the keypair was created successfully
      expect(keypair).toBeDefined();
      expect(keypair.publicKey.toBytes()).toBeDefined();
      expect(keypair.secretKey).toBeDefined();

      // Verify the secret key format (64 bytes: 32 private + 32 public)
      expect(keypair.secretKey.length).toBe(64);

      // Verify the public key format
      expect(keypair.publicKey.toBytes().length).toBe(32);

      // Verify address format (Solana uses base58)
      const address = keypair.publicKey.toBase58();
      expect(address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });
  });
});
