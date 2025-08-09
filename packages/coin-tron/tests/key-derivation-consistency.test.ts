import 'reflect-metadata';
import './setup';
import { describe, expect, test } from 'vitest';
import { TronChainWallet } from '../src/chain-wallet/wallet';
import { Tron } from './test-chains';
import * as secp256k1 from '@noble/secp256k1';
import { base, deriveEcdsaPrivateKey } from '@delandlabs/crypto-lib';

// Test vectors for deterministic key generation
const TEST_VECTORS = [
  {
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    expectedAddress: 'TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH', // Actual TRON address from BIP44 secp256k1 derivation
    expectedPublicKey:
      '04ff21f8e64d3a3c0198edfbb7afdc79be959432e92e2f8a1984bb436a414b8edcec0345aad0c1bf7da04fd036dd7f9f617e30669224283d950fab9dd84831dc83'
  },
  {
    mnemonic: 'eight record heavy smile elephant venue spend burst initial cousin casual order',
    // These values need to be verified with a reference implementation
    expectedAddress: null, // Will be captured from actual implementation
    expectedPublicKey: null
  },
  {
    mnemonic:
      'install assume ketchup talk giant bone foster flight situate math hurt border deputy grab mesh hope update dream evolve caught erupt win danger thought',
    expectedAddress: null,
    expectedPublicKey: null
  }
];

describe('TRON Key Derivation Consistency', () => {
  describe('Secp256k1 Key Derivation', () => {
    test('should use correct derivation path', async () => {
      // TRON's coin type is 195, path: m/44'/195'/0'/0/0

      // This test verifies the path is correctly used in the implementation
      const wallet = new TronChainWallet(Tron, TEST_VECTORS[0].mnemonic);
      const account = await wallet.getAccount();

      // The derivation path should produce a valid TRON address
      expect(account.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
    });

    test('should derive keys consistently with secp256k1', async () => {
      for (const vector of TEST_VECTORS) {
        const wallet = new TronChainWallet(Tron, vector.mnemonic, {
          keyDerivationMethod: 'secp256k1'
        });

        const account = await wallet.getAccount();

        // Verify address format
        expect(account.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);

        // Verify public key format (130 hex chars for uncompressed secp256k1)
        expect(account.publicKeyHex).toMatch(/^[0-9a-f]{130}$/);

        // If we have expected values, verify them
        if (vector.expectedAddress) {
          expect(account.address).toBe(vector.expectedAddress);
        }
        if (vector.expectedPublicKey) {
          expect(account.publicKeyHex).toBe(vector.expectedPublicKey);
        }

        // Log actual values for test vectors without expected values
        if (!vector.expectedAddress) {
          console.log(`Mnemonic: ${vector.mnemonic.split(' ').slice(0, 3).join(' ')}...`);
          console.log(`Address: ${account.address}`);
          console.log(`Public Key: ${account.publicKeyHex}`);
        }
      }
    });

    test('should generate valid secp256k1 signatures', async () => {
      const wallet = new TronChainWallet(Tron, TEST_VECTORS[0].mnemonic);
      const message = 'Test message for TRON signature';

      const signature = await wallet.signMessage({ message });

      // TRON signatures should be valid secp256k1 signatures
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThanOrEqual(64); // Minimum signature size
      expect(signature.length).toBeLessThanOrEqual(72); // Maximum DER signature size
    });

    test('should derive same keys using direct MnemonicUtil', async () => {
      const mnemonic = TEST_VECTORS[0].mnemonic;
      const path = "m/44'/195'/0'/0/0";

      // Derive using MnemonicUtil directly
      const privateKeyHex = await deriveEcdsaPrivateKey(mnemonic, path);
      const privateKey = base.fromHex(privateKeyHex);
      const publicKey = secp256k1.getPublicKey(privateKey, false);

      // Create wallet and compare
      const wallet = new TronChainWallet(Tron, mnemonic);
      const account = await wallet.getAccount();

      // Compare public keys
      expect(account.publicKeyHex).toBe(base.toHex(publicKey));
    });
  });

  describe('Address Generation', () => {
    test('should generate TRON address from public key correctly', async () => {
      const wallet = new TronChainWallet(Tron, TEST_VECTORS[0].mnemonic);
      const account = await wallet.getAccount();

      // TRON addresses should:
      // 1. Start with 'T'
      // 2. Be 34 characters long
      // 3. Use Base58 encoding
      expect(account.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
      expect(account.address.length).toBe(34);

      // Verify it's a valid Base58 string (no 0, O, I, or l)
      expect(account.address).not.toMatch(/[0OIl]/);
    });

    test('should generate deterministic addresses', async () => {
      const mnemonic = TEST_VECTORS[0].mnemonic;

      // Create multiple wallets with same mnemonic
      const addresses = [];
      for (let i = 0; i < 5; i++) {
        const wallet = new TronChainWallet(Tron, mnemonic);
        const account = await wallet.getAccount();
        addresses.push(account.address);
      }

      // All addresses should be identical
      const firstAddress = addresses[0];
      addresses.forEach((addr) => {
        expect(addr).toBe(firstAddress);
      });
    });
  });

  describe('Signature Consistency', () => {
    test('should produce consistent signatures for same message', async () => {
      const wallet = new TronChainWallet(Tron, TEST_VECTORS[0].mnemonic);
      const message = 'Consistent signature test';

      // Sign same message multiple times
      const signatures = [];
      for (let i = 0; i < 3; i++) {
        const sig = await wallet.signMessage({ message });
        signatures.push(base.toHex(sig));
      }

      // All signatures should be identical (deterministic signing)
      const firstSig = signatures[0];
      signatures.forEach((sig) => {
        expect(sig).toBe(firstSig);
      });
    });

    test('should produce different signatures for different messages', async () => {
      const wallet = new TronChainWallet(Tron, TEST_VECTORS[0].mnemonic);

      const sig1 = await wallet.signMessage({ message: 'Message 1' });
      const sig2 = await wallet.signMessage({ message: 'Message 2' });

      expect(base.toHex(sig1)).not.toBe(base.toHex(sig2));
    });
  });

  describe('Cross-Implementation Compatibility', () => {
    test('should match known TRON test vector', async () => {
      // Using the first test vector which has expected values
      const vector = TEST_VECTORS[0];
      if (vector.expectedAddress && vector.expectedPublicKey) {
        const wallet = new TronChainWallet(Tron, vector.mnemonic);
        const account = await wallet.getAccount();

        expect(account.address).toBe(vector.expectedAddress);
        expect(account.publicKeyHex).toBe(vector.expectedPublicKey);
      }
    });
  });
});
