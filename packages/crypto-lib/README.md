# @delandlabs/crypto-lib

Core cryptographic library for Hibit ID SDK, providing secure key derivation, encoding utilities, and cryptographic operations.

## Features

- ✅ **Key Derivation**: BIP32/BIP44/BIP39 compliant key derivation
- ✅ **Dual Curve Support**: ECDSA (secp256k1) and Ed25519 cryptography
- ✅ **Mnemonic Generation**: BIP39 mnemonic phrase generation and validation
- ✅ **Encoding Utilities**: Base58, Base64, Bech32, Hex, and more
- ✅ **Hash Functions**: SHA-256, SHA-512, RIPEMD-160, Keccak-256
- ✅ **Cross-Platform**: Browser and Node.js compatibility
- ✅ **Memory Safety**: Secure memory management for sensitive data

## Installation

```bash
# Usually installed as part of the main SDK
npm install @delandlabs/hibit-id-sdk

# For direct usage (advanced)
npm install @delandlabs/crypto-lib
```

## Usage

### Mnemonic Generation and Validation

```typescript
import { MnemonicUtil } from '@delandlabs/crypto-lib';

// Generate a new mnemonic
const mnemonic = MnemonicUtil.generateMnemonic();
console.log('Generated mnemonic:', mnemonic);

// Validate mnemonic
const isValid = MnemonicUtil.validateMnemonic(mnemonic);
console.log('Is valid:', isValid);

// Convert mnemonic to seed
const seed = await MnemonicUtil.mnemonicToSeed(mnemonic);
console.log('Seed length:', seed.length); // 64 bytes
```

### ECDSA Key Derivation (secp256k1)

```typescript
import { ecdsa } from '@delandlabs/crypto-lib';

// Derive key pair from mnemonic
const keyPair = await ecdsa.deriveKeyPair(mnemonic, "m/44'/60'/0'/0/0");
console.log('Private key:', keyPair.privateKey);
console.log('Public key:', keyPair.publicKey);
console.log('Address:', keyPair.address);

// Sign data
const message = 'Hello, blockchain!';
const signature = await ecdsa.sign(keyPair.privateKey, message);
console.log('Signature:', signature);

// Verify signature
const isValid = await ecdsa.verify(keyPair.publicKey, message, signature);
console.log('Signature valid:', isValid);
```

### Ed25519 Key Derivation

```typescript
import { ed25519 } from '@delandlabs/crypto-lib';

// Derive Ed25519 key pair
const keyPair = await ed25519.deriveKeyPair(mnemonic, "m/44'/501'/0'/0'");
console.log('Private key:', keyPair.privateKey);
console.log('Public key:', keyPair.publicKey);

// Sign data
const message = new TextEncoder().encode('Hello, Ed25519!');
const signature = await ed25519.sign(keyPair.privateKey, message);
console.log('Signature:', signature);

// Verify signature
const isValid = await ed25519.verify(keyPair.publicKey, message, signature);
console.log('Signature valid:', isValid);
```

### Encoding and Decoding

```typescript
import { base, hex, base58, base64, bech32 } from '@delandlabs/crypto-lib';

// Hex encoding/decoding
const data = new Uint8Array([1, 2, 3, 4, 5]);
const hexString = hex.encode(data);
const decoded = hex.decode(hexString);

// Base58 encoding (Bitcoin-style)
const base58String = base58.encode(data);
const base58Decoded = base58.decode(base58String);

// Base64 encoding
const base64String = base64.encode(data);
const base64Decoded = base64.decode(base64String);

// Bech32 encoding (for Segwit addresses)
const bech32Address = bech32.encode('bc', data);
const bech32Decoded = bech32.decode(bech32Address);
```

### Hash Functions

```typescript
import { hash } from '@delandlabs/crypto-lib';

const data = new TextEncoder().encode('Hello, world!');

// SHA-256
const sha256Hash = await hash.sha256(data);
console.log('SHA-256:', hex.encode(sha256Hash));

// SHA-512
const sha512Hash = await hash.sha512(data);
console.log('SHA-512:', hex.encode(sha512Hash));

// RIPEMD-160
const ripemd160Hash = await hash.ripemd160(data);
console.log('RIPEMD-160:', hex.encode(ripemd160Hash));

// Keccak-256 (Ethereum)
const keccakHash = await hash.keccak256(data);
console.log('Keccak-256:', hex.encode(keccakHash));

// Double SHA-256 (Bitcoin)
const doubleSha256 = await hash.doubleSha256(data);
console.log('Double SHA-256:', hex.encode(doubleSha256));
```

### HMAC (Hash-based Message Authentication Code)

```typescript
import { hmac } from '@delandlabs/crypto-lib';

const key = new TextEncoder().encode('secret-key');
const message = new TextEncoder().encode('message to authenticate');

// HMAC-SHA256
const hmacSha256 = await hmac.sha256(key, message);
console.log('HMAC-SHA256:', hex.encode(hmacSha256));

// HMAC-SHA512
const hmacSha512 = await hmac.sha512(key, message);
console.log('HMAC-SHA512:', hex.encode(hmacSha512));
```

## Architecture

### Core Components

#### Cryptographic Operations

- **ecdsa.ts**: ECDSA operations using secp256k1 curve
- **ed25519.ts**: Ed25519 signature scheme operations
- **mnemonic.ts**: BIP39 mnemonic phrase utilities
- **types.ts**: TypeScript definitions for crypto operations

#### Base Utilities

- **base58.ts**: Base58 encoding (Bitcoin-style)
- **base58Check.ts**: Base58Check encoding with checksum
- **base64.ts**: Base64 encoding/decoding
- **bech32.ts**: Bech32 address encoding (Segwit)
- **hex.ts**: Hexadecimal encoding/decoding
- **hash.ts**: Cryptographic hash functions
- **hmac.ts**: HMAC operations

#### Helper Utilities

- **ascii.ts**: ASCII string utilities
- **utf8.ts**: UTF-8 string encoding/decoding
- **helper.ts**: General helper functions
- **precondition.ts**: Input validation utilities

### Supported Cryptographic Standards

#### Key Derivation

- **BIP32**: Hierarchical Deterministic (HD) wallets
- **BIP44**: Multi-account hierarchy for deterministic wallets
- **BIP39**: Mnemonic code for generating deterministic keys

#### Signature Schemes

- **ECDSA**: Elliptic Curve Digital Signature Algorithm (secp256k1)
- **Ed25519**: Edwards-curve Digital Signature Algorithm

#### Hash Functions

- **SHA-256**: Secure Hash Algorithm 256-bit
- **SHA-512**: Secure Hash Algorithm 512-bit
- **RIPEMD-160**: RACE Integrity Primitives Evaluation Message Digest
- **Keccak-256**: Ethereum's hash function
- **BLAKE2b**: High-speed cryptographic hash function

## Security Features

### Memory Management

```typescript
import { clearSensitiveArray } from '@delandlabs/crypto-lib';

// Safe handling of sensitive data
const privateKey = new Uint8Array(32);
// ... use private key
clearSensitiveArray(privateKey); // Securely clear memory
```

### Input Validation

```typescript
import { precondition } from '@delandlabs/crypto-lib';

// Validate inputs before processing
precondition.checkArgument(data.length > 0, 'Data cannot be empty');
precondition.checkNotNull(mnemonic, 'Mnemonic is required');
```

### Constant-Time Operations

All cryptographic operations are implemented to prevent timing attacks:

- Constant-time signature verification
- Safe memory comparison functions
- Secure random number generation

## Multi-Format Support

### Address Formats

The library supports multiple blockchain address formats:

```typescript
// Bitcoin-style addresses
const btcAddress = base58Check.encode(publicKeyHash);

// Ethereum addresses
const ethAddress = '0x' + hex.encode(keccak256(publicKey).slice(-20));

// Bech32 addresses (Segwit)
const segwitAddress = bech32.encode('bc', witnessProgram);

// Base32 addresses (Algorand, etc.)
const base32Address = base32.encode(publicKey);
```

## Development

### Building

```bash
# Build both ESM and CommonJS formats
pnpm build:crypto-lib
```

### Testing

```bash
pnpm test:crypto-lib
```

### Type Checking

```bash
pnpm typecheck packages/crypto-lib/src/**/*.ts
```

## Dependencies

### Core Cryptography

- **@noble/secp256k1**: Pure JavaScript secp256k1 implementation
- **@noble/ed25519**: Pure JavaScript Ed25519 implementation
- **@noble/hashes**: Cryptographic hash functions
- **@scure/bip32**: BIP32 hierarchical deterministic keys
- **@scure/bip39**: BIP39 mnemonic phrases

### Utilities

- **js-sha3**: Keccak and SHA-3 implementation
- **js-base64**: Base64 encoding utilities

## Browser Compatibility

The library works in all modern browsers and environments:

- **Web Browsers**: Chrome 88+, Firefox 85+, Safari 14+
- **Node.js**: 16+ (with polyfills for older versions)
- **React Native**: Full support with metro bundler
- **Webpack/Vite**: ESM and CommonJS builds available

## Performance Optimizations

1. **WebAssembly**: Uses WASM for performance-critical operations where available
2. **Lazy Loading**: Cryptographic libraries loaded on demand
3. **Memory Pooling**: Reuse buffers for repeated operations
4. **Native APIs**: Uses Web Crypto API when available

## Common Patterns

### Secure Key Generation

```typescript
import { ecdsa, clearSensitiveArray } from '@delandlabs/crypto-lib';

async function generateSecureWallet(mnemonic: string, derivationPath: string) {
  const keyPair = await ecdsa.deriveKeyPair(mnemonic, derivationPath);

  try {
    // Use the key pair for operations
    return {
      address: keyPair.address,
      publicKey: keyPair.publicKey
      // Don't return private key
    };
  } finally {
    // Always clear sensitive data
    clearSensitiveArray(keyPair.privateKey);
  }
}
```

### Multi-Chain Key Derivation

```typescript
// Derive keys for multiple chains from single mnemonic
const ethKeyPair = await ecdsa.deriveKeyPair(mnemonic, "m/44'/60'/0'/0/0"); // Ethereum
const btcKeyPair = await ecdsa.deriveKeyPair(mnemonic, "m/44'/0'/0'/0/0"); // Bitcoin
const solKeyPair = await ed25519.deriveKeyPair(mnemonic, "m/44'/501'/0'/0'"); // Solana
```

## Error Handling

```typescript
import { CryptoError, ValidationError } from '@delandlabs/crypto-lib';

try {
  const keyPair = await ecdsa.deriveKeyPair(mnemonic, derivationPath);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof CryptoError) {
    console.error('Cryptographic operation failed:', error.message);
  }
}
```

## Contributing

When contributing to this package:

1. **Security First**: All changes must maintain security guarantees
2. **Memory Safety**: Use `clearSensitiveArray` for sensitive data
3. **Constant Time**: Implement constant-time algorithms where possible
4. **Test Coverage**: Maintain 100% test coverage for security-critical code
5. **Cross-Platform**: Test on both browser and Node.js environments

## Security Considerations

1. **Private Key Management**: Private keys are never logged or stored persistently
2. **Memory Clearing**: Sensitive data is explicitly cleared from memory
3. **Timing Attacks**: All operations use constant-time implementations
4. **Randomness**: Uses cryptographically secure random number generation
5. **Dependency Auditing**: All dependencies are regularly audited for vulnerabilities

## License

MIT License - see LICENSE file for details.
