# @delandlabs/coin-base

Base classes and utilities for blockchain wallet implementations in the Hibit ID SDK.

## Features

- ✅ **Type Safety**: Branded types prevent mixing addresses from different chains
- ✅ **Security First**: Automatic sensitive data redaction in logs and errors
- ✅ **DRY Principle**: Centralized validation and common utilities to eliminate code duplication
- ✅ **Error Handling**: Comprehensive error hierarchy with context preservation
- ✅ **Extensibility**: Abstract base classes with template method pattern
- ✅ **Cross-Cutting Concerns**: Decorators for logging, caching, retry logic
- ✅ **Memory Management**: Safe cleanup utilities for sensitive data

## Installation

```bash
# Usually installed as part of the main SDK
npm install @delandlabs/hibit-id-sdk

# For direct usage (advanced)
npm install @delandlabs/coin-base
```

## Usage

### Type-Safe Address Handling

Prevent address mixing between chains with branded types:

```typescript
import { Address, createAddress } from '@delandlabs/coin-base';

// Type-safe addresses - can't mix Ethereum and Solana addresses
const ethAddress: Address<'Ethereum'> = createAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f6E8e0', 'Ethereum');
const solAddress: Address<'Solana'> = createAddress('7VQo3HFLNH5QqGtM8eC3GQjkbpzaa8CxyfMSr2JH1eFi', 'Solana');

// This would cause a TypeScript error:
// const wrong: Address<'Ethereum'> = solAddress; // ❌ Type error!
```

### Automatic Sensitive Data Protection

Sensitive data is automatically redacted in logs and error messages:

```typescript
import { withSensitiveDataProtection } from '@delandlabs/coin-base';

class MyWallet {
  @withSensitiveDataProtection
  async transfer(params: TransferParams): Promise<string> {
    // Even if this throws, mnemonics/private keys won't leak to logs
    throw new Error(`Failed with mnemonic: ${mnemonic}`);
    // Logs will show: "Failed with mnemonic: [REDACTED]"
  }
}
```

## Core Components

### BaseChainWallet

The abstract base class that all blockchain wallet implementations must extend:

```typescript
import { BaseChainWallet, ChainInfo } from '@delandlabs/coin-base';

export class MyChainWallet extends BaseChainWallet {
  // Required: Address validation
  public isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Required: Account information
  protected async getAccountImpl(): Promise<ChainAccount> {
    const account = await this.deriveAccount();
    return {
      address: account.address,
      publicKey: account.publicKey
    };
  }

  // Required: Balance query
  protected async balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber> {
    // Validation is already handled by base class
    return await this.queryBalance(params.address);
  }

  // Required: Transfer implementation
  protected async transferImpl(params: TransferParams): Promise<string> {
    // Address and amount validation already handled by base class
    return await this.sendTransaction(params);
  }

  // Required: Message signing
  protected async signMessageImpl(params: SignMessageParams): Promise<SignedMessage> {
    return await this.signWithPrivateKey(params.message);
  }

  // Required: Fee estimation
  protected async estimateTransactionFeeImpl(params: TransferParams): Promise<BigNumber> {
    return await this.calculateFee(params);
  }

  // Required: Cleanup
  protected async destroyImpl(): Promise<void> {
    cleanupReferences(this, ['connection', 'client']);
  }
}
```

### Common Utilities

Pre-built utilities to standardize wallet operations and enforce DRY principle:

```typescript
import {
  validateAddress,
  assertValidAddressForBalance,
  assertValidAddressForTransaction,
  assertValidTransferAmount,
  assertValidAddressForFeeEstimation,
  cleanupReferences,
  createReadyPromise
} from '@delandlabs/coin-base';

// Validation helpers with proper error codes
assertValidAddressForBalance(address, isValidAddress, 'MyChain');
assertValidAddressForTransaction(recipientAddress, isValidAddress, 'MyChain');
assertValidTransferAmount(amount, 'MyChain');
assertValidAddressForFeeEstimation(recipientAddress, isValidAddress, 'MyChain');

// Memory management
cleanupReferences(this, ['connection', 'client', 'provider']);

// Async initialization pattern
this.readyPromise = createReadyPromise(() => this.initWallet(mnemonic));
```

### Mnemonic and Key Derivation

Centralized mnemonic validation and key derivation:

```typescript
import { MnemonicUtil, EncodingFormat } from '@delandlabs/coin-base';

// Mnemonic validation (DRY - single source of truth)
const isValid = MnemonicUtil.validateMnemonic(mnemonic);

// Ed25519 key derivation (e.g., for Solana, TON)
const ed25519Key = await MnemonicUtil.deriveEd25519PrivateKey(
  mnemonic,
  "m/44'/501'/0'/0'", // Solana derivation path
  false, // skipValidation (already validated)
  EncodingFormat.HEX,
  logger
);

// ECDSA key derivation (e.g., for Ethereum, Bitcoin)
const ecdsaKey = await MnemonicUtil.deriveEcdsaPrivateKey(
  mnemonic,
  "m/44'/60'/0'/0/0", // Ethereum derivation path
  logger
);

// Schnorr key derivation (e.g., for Kaspa)
const schnorrKey = await MnemonicUtil.deriveSchnorrPrivateKey(
  mnemonic,
  "m/44'/111111'/0'/0/0", // Kaspa derivation path
  logger
);
```

### Error Handling

Comprehensive error types with proper context:

```typescript
import {
  MnemonicError,
  NetworkError,
  TransactionError,
  BalanceQueryError,
  FeeEstimationError,
  MessageSigningError,
  HibitIdSdkErrorCode
} from '@delandlabs/coin-base';

// Structured error handling
try {
  await wallet.transfer(params);
} catch (error) {
  if (error instanceof TransactionError) {
    console.log(error.code); // e.g., INSUFFICIENT_BALANCE
    console.log(error.details); // { chainName: 'Ethereum', ... }
  }
}

// Creating errors with context
throw new BalanceQueryError(HibitIdSdkErrorCode.BALANCE_QUERY_FAILED, 'Failed to query balance', {
  address,
  tokenContract
});
```

### Logging and Decorators

Built-in logging with automatic context extraction:

```typescript
import { withLogging, withSensitiveDataProtection } from '@delandlabs/coin-base';

class MyWallet extends BaseChainWallet {
  @withLogging('Transfer tokens')
  @withSensitiveDataProtection
  async transfer(params: TransferParams): Promise<string> {
    // Automatically logs:
    // - Method entry with parameters (sensitive data redacted)
    // - Method exit with result
    // - Execution time
    // - Any errors (with sensitive data redacted)
    return await this.performTransfer(params);
  }
}
```

## Type Definitions

### RPC Configuration

```typescript
interface RpcConfiguration {
  /** Primary RPC endpoint */
  primary: string;
  /** Fallback RPC endpoints for redundancy */
  fallbacks?: string[];
  /** WebSocket RPC endpoint for real-time connections */
  webSocket?: string;
}

interface ChainInfo {
  chainId: ChainId;
  name: string;
  fullName: string;
  icon: string;
  nativeAssetSymbol: string;
  nativeAssetDecimals: number;
  supportedSignaturesSchemas: WalletSignatureSchema[];
  explorer: string;
  rpc: RpcConfiguration;
  isMainnet: boolean;
  isNativeGas: boolean;
  ecosystem: Ecosystem;
}
```

### Branded Types

Type-safe addresses prevent cross-chain errors:

```typescript
// Branded type definition
type Address<Chain extends string> = string & {
  __brand: `${Chain}Address`;
};

// Usage in parameters
interface BalanceQueryParams {
  address: Address<string>; // Chain-specific address
  token: TokenInfo;
}

interface TransferParams {
  recipientAddress: Address<string>; // Type-safe recipient
  amount: BigNumber;
  token: TokenInfo;
  payload?: string;
}
```

## Best Practices

### 1. **Always Use Type-Safe Addresses**

```typescript
// ✅ Good
const address = createAddress('0x...', 'Ethereum');

// ❌ Bad
const address = '0x...' as Address<'Ethereum'>;
```

### 2. **Leverage Common Utilities**

```typescript
// ✅ Good - DRY principle
assertValidAddressForTransaction(address, this.isValidAddress, 'MyChain');

// ❌ Bad - Duplicating validation logic
if (!this.isValidAddress(address)) {
  throw new Error('Invalid address');
}
```

### 3. **Use Decorators for Cross-Cutting Concerns**

```typescript
// ✅ Good
@withLogging('Critical operation')
@withSensitiveDataProtection
async sensitiveOperation() { }

// ❌ Bad - Manual logging and data protection
async sensitiveOperation() {
  console.log('Starting...');
  try {
    // ... manual data sanitization
  } catch (e) {
    // ... manual error sanitization
  }
}
```

### 4. **Proper Resource Cleanup**

```typescript
// ✅ Good
protected async destroyImpl(): Promise<void> {
  cleanupReferences(this, ['connection', 'provider', 'signer']);
}

// ❌ Bad - Manual cleanup
protected async destroyImpl(): Promise<void> {
  this.connection = null;
  this.provider = null;
  this.signer = null;
}
```

## Testing

The package includes comprehensive test utilities:

```typescript
import { createAddress, AddressValidatorRegistry } from '@delandlabs/coin-base';

// Register test validators
AddressValidatorRegistry.register('TestChain', (addr) => addr.startsWith('test_'));

// Create test addresses
const testAddr = createAddress('test_123', 'TestChain');
```

## Dependencies

### Core

- **@delandlabs/crypto-lib**: Cryptographic utilities and key derivation
- **@delandlabs/hibit-basic-types**: Common type definitions
- **bignumber.js**: Arbitrary precision decimal arithmetic

### Development

- **typescript**: TypeScript compiler
- **vitest**: Testing framework
- **@noble/secp256k1**: ECDSA operations
- **@noble/ed25519**: Ed25519 operations

## Architecture Patterns

### Template Method Pattern

The `BaseChainWallet` class defines the workflow structure while allowing subclasses to implement specific blockchain operations:

```typescript
// Base class defines the template
public async transfer(params: TransferParams): Promise<string> {
  // Common validation logic
  this.validateTransferParams(params);

  // Delegate to subclass implementation
  return await this.transferImpl(params);
}

// Subclass implements the specific logic
protected abstract async transferImpl(params: TransferParams): Promise<string>;
```

### Decorator Pattern

Cross-cutting concerns are handled through decorators:

```typescript
@withErrorHandling({ errorType: 'transaction' })
@withLogging('Transfer operation')
@cleanSensitiveData()
@Retry({ maxAttempts: 3 })
public async transfer(params: TransferParams): Promise<string> {
  return await this.transferImpl(params);
}
```

### Strategy Pattern

Different blockchain integrations can use different strategies for handling various asset types:

```typescript
export abstract class BaseAssetHandler {
  abstract balanceOf(params: BalanceQueryParams): Promise<BigNumber>;
  abstract transfer(params: TransferParams): Promise<string>;
  abstract estimateFee(params: TransferParams): Promise<BigNumber>;
  abstract getAssetType(): ChainAssetType;
  abstract cleanup(): void;
}
```

## Development

### Building

```bash
pnpm build:coin-base
```

### Testing

```bash
pnpm test:coin-base
```

### Security Linting

```bash
pnpm lint packages/coin-base/src/**/*.ts
```

### Coverage

```bash
pnpm coverage:coin-base
```

## Performance Optimizations

1. **Memoization**: Cache expensive operations like key derivation
2. **Lazy Loading**: Load cryptographic libraries on demand
3. **Memory Pooling**: Reuse objects and buffers where possible
4. **Efficient Validation**: Fast-path validation for common cases

## Security Features

### Sensitive Data Protection

- Automatic redaction of mnemonics, private keys, and seeds from logs
- Memory clearing utilities for sensitive data
- Constant-time operations where applicable

### Input Validation

- Comprehensive validation utilities
- Branded types prevent type confusion
- Precondition checking with clear error messages

### Error Security

- Structured error hierarchy with context preservation
- Sensitive data automatically redacted from error objects
- No information disclosure in error messages

## Contributing

When contributing to this package:

1. **Follow DRY Principle**: Centralize common functionality
2. **Maintain Type Safety**: Use branded types and proper TypeScript
3. **Add Comprehensive Tests**: Maintain 100% test coverage
4. **Security First**: Use `@cleanSensitiveData` for sensitive methods
5. **Documentation**: Update JSDoc comments for public APIs

## License

MIT License - see LICENSE file for details.
