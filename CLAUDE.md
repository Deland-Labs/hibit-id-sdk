# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build Commands

```bash
# Build all packages
pnpm build:all

# Build specific packages (respects dependency order)
pnpm build:crypto-lib    # Core cryptographic operations
pnpm build:coin-base     # Base functionality and abstractions
pnpm build:coin-ethereum # Ethereum integration
pnpm build:coin-ton      # TON integration
pnpm build:coin-solana   # Solana integration
pnpm build:coin-tron     # Tron integration
pnpm build:coin-dfinity  # Internet Computer (ICP) integration
pnpm build:coin-kaspa    # Kaspa integration
pnpm build:sdk           # Main SDK aggregating all chains
```

### Development

```bash
# Run SDK in development mode with hot reload
pnpm dev:sdk

# Run tests in watch mode for specific packages
pnpm test:coin-dfinity --watch
```

### Testing

```bash
# Run all tests
pnpm test:all

# Test specific packages
pnpm test:crypto-lib     # Test crypto library
pnpm test:coin-base      # Test base functionality
pnpm test:coin-dfinity   # Test ICP integration
pnpm test:coin-ethereum  # Test Ethereum integration
pnpm test:coin-solana    # Test Solana integration
pnpm test:coin-ton       # Test TON integration
pnpm test:coin-tron      # Test Tron integration
pnpm test:coin-kaspa     # Test Kaspa integration
pnpm test:sdk            # Test main SDK
```

### Quality Assurance

```bash
# Type checking
pnpm typecheck:all

# Linting
pnpm lint:all

# Code coverage
pnpm coverage:all
```

## Architecture Overview

This is a monorepo for Hibit ID, a non-custodial multi-chain wallet SDK. The architecture follows a modular design with strict dependency hierarchy and shared patterns across all blockchain integrations.

### Package Structure and Dependencies

```
┌─────────────────┐
│      SDK        │  ← Main package for developers
├─────────────────┤
│  Blockchain     │  ← Individual chain implementations
│  Packages       │    (coin-ethereum, coin-dfinity, etc.)
├─────────────────┤
│   coin-base     │  ← Base classes, interfaces, decorators
├─────────────────┤
│   crypto-lib    │  ← Core cryptographic operations
└─────────────────┘
```

#### Core Infrastructure

- **packages/crypto-lib**: Core cryptographic operations, key derivation, encoding/decoding utilities
- **packages/coin-base**: Base classes, interfaces, decorators, validation framework, error handling

#### Blockchain Integrations

- **packages/coin-ethereum**: Ethereum and ERC-20 token support
- **packages/coin-solana**: Solana and SPL token support
- **packages/coin-ton**: TON blockchain and Jetton support
- **packages/coin-tron**: Tron and TRC-20 token support
- **packages/coin-dfinity**: Internet Computer (ICP) and ICRC token support
- **packages/coin-kaspa**: Kaspa and KRC-20 token support

#### Developer Interface

- **packages/sdk**: Main SDK that aggregates all blockchain integrations with unified API

### Build Dependencies

The build system uses Turborepo with strict dependency enforcement:

1. **crypto-lib** builds first (ESM + CommonJS formats)
2. **coin-base** depends on crypto-lib
3. **All blockchain packages** depend on coin-base
4. **SDK** depends on coin-base and all blockchain packages

### Key Architectural Patterns

#### 1. Strategy Pattern for Asset Handling

Each blockchain package implements a consistent strategy pattern:

```typescript
// Base pattern implemented by all chains
export abstract class BaseAssetHandler {
  abstract balanceOf(params: BalanceQueryParams): Promise<BigNumber>;
  abstract transfer(params: TransferParams): Promise<string>;
  abstract estimateFee(params: TransferParams): Promise<BigNumber>;
  abstract getAssetType(): ChainAssetType;
  abstract cleanup(): void;
}

// Example: ICP implementation
export class IcpNativeHandler extends BaseAssetHandler {
  /* ... */
}
export class IcrcTokenHandler extends BaseAssetHandler {
  /* ... */
}
```

#### 2. Decorator-Based Cross-Cutting Concerns

All packages use coin-base decorators for consistent behavior:

```typescript
// Error handling, logging, caching, retry logic
@withErrorHandling({ errorType: 'transaction' })
@withLogging('Transfer operation')
@Memoize({ ttl: 300000 })
@Retry({ maxAttempts: 3 })
public async transfer(params: TransferParams): Promise<string> {
  // Implementation without boilerplate
}
```

#### 3. Unified Wallet Interface

All blockchain wallets extend BaseChainWallet:

```typescript
export abstract class BaseChainWallet {
  // Required implementations for all chains
  protected abstract getAccountImpl(): Promise<ChainAccount>;
  protected abstract signMessageImpl(params: SignMessageParams): Promise<Uint8Array>;
  protected abstract balanceOfImpl(params: BalanceQueryParams): Promise<BigNumber>;
  protected abstract transferImpl(params: TransferParams): Promise<string>;
  protected abstract estimateFeeImpl(params: TransferParams): Promise<BigNumber>;
  protected abstract waitForConfirmationImpl(
    params: TransactionConfirmationParams
  ): Promise<TransactionConfirmationResult>;
  protected abstract destroyImpl(): void;
}
```

#### 4. Validation Framework

Centralized validation using coin-base validators:

```typescript
// Common validation patterns across all chains
assertValidAddressForBalance(address, validator, chainName);
assertValidAddressForTransaction(recipientAddress, validator, chainName);
assertValidTransferAmount(amount, chainName);
assertValidAmountForFeeEstimation(amount, chainName);
```

#### 5. Chain-Specific Configuration

Each package provides comprehensive configuration:

```typescript
// Example: packages/coin-dfinity/src/chain-wallet/config.ts
export const CHAIN_CONFIG = {
  CHAIN: ChainType.Dfinity,
  CHAIN_NAME: 'Internet Computer',
  DERIVING_PATH: "m/44'/223'/0'/0'/0'"
};

export const DfinityRetry = createChainRetry(CHAIN_CONFIG.CHAIN_NAME, ['canister', 'replica', 'consensus'], {
  retries: 3,
  minTimeout: 1000
});
```

### Package-Specific Implementations

#### coin-dfinity (Internet Computer)

- **Architecture**: Strategy pattern with IcpNativeHandler and IcrcTokenHandler
- **Standards**: ICRC-1, ICRC-3, ICRC-25, ICRC-27, ICRC-32, ICRC-49
- **Address Formats**: Principal and AccountIdentifier support
- **Key Features**: Instant finality, canister interactions

#### coin-ethereum

- **Architecture**: Strategy pattern with EthNativeHandler and Erc20TokenHandler
- **Standards**: ERC-20 token standard
- **Key Features**: Web3 provider integration, gas estimation, transaction confirmation

#### coin-solana

- **Architecture**: Strategy pattern with SolNativeHandler and SplTokenHandler
- **Standards**: SPL token standard
- **Key Features**: Connection manager, program interactions, account rent calculation

#### coin-ton

- **Architecture**: Strategy pattern with TonNativeHandler and JettonHandler
- **Standards**: Jetton standard
- **Key Features**: TON Connect integration, cell-based transactions

#### coin-tron

- **Architecture**: Strategy pattern with TrxNativeHandler and Trc20TokenHandler
- **Standards**: TRC-20 token standard
- **Key Features**: Energy/bandwidth management, smart contract interactions

#### coin-kaspa

- **Architecture**: Strategy pattern with KasNativeHandler and Krc20TokenHandler
- **Standards**: KRC-20 token standard
- **Key Features**: UTXO-based transactions, high throughput support

### Development Workflow

#### 1. Making Changes

- Follow existing patterns across blockchain packages
- Maintain consistency in method signatures and error handling
- Use established decorators from coin-base
- Ensure method visibility ordering: public → protected → private

#### 2. Adding New Chains

```bash
# 1. Create new package structure
mkdir packages/coin-[blockchain]
cd packages/coin-[blockchain]

# 2. Copy structure from existing package (e.g., coin-dfinity)
# 3. Update package.json dependencies
# 4. Implement required BaseChainWallet methods
# 5. Create asset handlers extending BaseAssetHandler
# 6. Add comprehensive tests
# 7. Update turbo.json build configuration
```

#### 3. Testing Strategy

- **Unit Tests**: Each method and component individually tested
- **Integration Tests**: Cross-component functionality verification
- **Error Scenario Tests**: Network failures, invalid inputs, edge cases
- **Mock Strategy**: Comprehensive mocking of external dependencies

#### 4. Code Quality Standards

##### Method Organization

```typescript
export class ExampleWallet extends BaseChainWallet {
  // ========== PUBLIC METHODS ==========
  public isValidAddress(address: string): boolean {
    /* ... */
  }

  // ========== PROTECTED METHODS ==========
  protected async getAccountImpl(): Promise<ChainAccount> {
    /* ... */
  }
  protected async transferImpl(params: TransferParams): Promise<string> {
    /* ... */
  }

  // ========== PRIVATE METHODS ==========
  private initAssetHandlers(): void {
    /* ... */
  }
}
```

##### Security Best Practices

```typescript
// Sensitive data handling
@cleanSensitiveData()
private async initWallet(mnemonic: string): Promise<void> {
  const privateKeyBytes = base.fromHex(privateKeyHex);
  const identity = createIdentity(privateKeyBytes.buffer);

  // Clear sensitive data immediately
  clearSensitiveArray(privateKeyBytes);
}
```

### Important Notes

#### Environment and Tooling

- **Package Manager**: pnpm v9.15.9 (workspace support required)
- **Build Tool**: Vite with TypeScript support
- **Test Runner**: Vitest with coverage reporting
- **Code Quality**: Husky + lint-staged pre-commit hooks

#### Build Configuration

- **Output Formats**: ESM + UMD for maximum compatibility
- **Source Maps**: Always included for debugging
- **Type Checking**: Enabled in both build and test processes
- **Tree Shaking**: Optimized builds with unused code elimination

#### Security Requirements

- **Sensitive Data**: Automatic clearing from memory
- **Error Handling**: Sensitive information redacted from errors
- **Validation**: Comprehensive input validation at all entry points
- **Dependencies**: Regular security audits and updates

## Code Quality Requirements

### Architecture Principles

#### SOLID Principles

- **Single Responsibility**: Each class has one well-defined purpose
- **Open/Closed**: Extensible without modifying existing code
- **Liskov Substitution**: Derived classes fully substitutable
- **Interface Segregation**: Focused, cohesive interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

#### Design Patterns

- **Strategy Pattern**: Asset handling across all blockchain packages
- **Decorator Pattern**: Cross-cutting concerns (logging, caching, retry)
- **Factory Pattern**: Chain-specific configuration and setup
- **Template Method**: BaseChainWallet defines workflow structure

### Testing Requirements

#### Coverage Standards

- **Minimum**: 90% code coverage for all packages
- **Critical Paths**: 100% coverage for security-sensitive code
- **Error Scenarios**: Comprehensive error condition testing
- **Performance**: Load testing for high-frequency operations

#### Test Organization

```typescript
// Example test structure
describe('IcpChainWallet', () => {
  describe('Constructor', () => {
    /* ... */
  });
  describe('Public Methods', () => {
    describe('isValidAddress', () => {
      /* ... */
    });
  });
  describe('Protected Methods', () => {
    describe('transferImpl', () => {
      /* ... */
    });
  });
  describe('Error Scenarios', () => {
    /* ... */
  });
  describe('Integration', () => {
    /* ... */
  });
});
```

### Naming Conventions

#### Core Principles

- **Clarity over Brevity**: Names should be self-explanatory
- **Consistency**: Follow established patterns within each package
- **Purpose over Implementation**: Focus on what, not how

#### Classes and Interfaces

- Use descriptive names that indicate purpose and responsibility
- Avoid overly generic terms like `Manager`, `Handler` unless contextually clear
- Follow existing patterns established in the codebase

#### Methods and Properties

- **Boolean Methods**: Use `is`, `has`, `can` prefixes where appropriate
- **Async Methods**: Always use `async/await`, never raw Promises
- **Descriptive Names**: Self-documenting without excessive verbosity
- **Constants**: UPPER_SNAKE_CASE for configuration constants

#### Files and Directories

- **Kebab-case** for file names: `chain-wallet.ts`, `asset-handlers/`
- **Logical Grouping**: Organize by feature/domain, not by type
- **Index Files**: Re-export public APIs for clean imports

### Language and Documentation

#### Code Language

- **English Only**: All code, comments, variable names, documentation
- **Self-Documenting Code**: Choose names that explain intent
- **JSDoc**: Document public APIs and complex logic
- **Practical Examples**: Include usage examples where helpful

#### Error Messages

- **Clear and Actionable**: Help users understand what went wrong
- **Contextual Information**: Include relevant details (chain, operation)
- **Security Conscious**: Never expose sensitive data in errors
- **Consistent Format**: Follow established error message patterns

### Performance and Optimization

#### Caching Strategy

```typescript
// Appropriate caching for different data types
@Memoize({ ttl: 300000 }) // 5 minutes for fees
private async fetchTransactionFee(): Promise<bigint> { /* ... */ }

@Memoize({ ttl: 1800000 }) // 30 minutes for metadata
private async fetchTokenMetadata(): Promise<TokenInfo> { /* ... */ }

// No caching for real-time data
public async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
  // Always fetch fresh balance data
}
```

#### Resource Management

- **Connection Pooling**: Reuse network connections where possible
- **Memory Management**: Explicit cleanup in destroy methods
- **Rate Limiting**: Respect API rate limits with appropriate delays

## Security Guidelines

### Sensitive Data Handling

```typescript
// Proper sensitive data lifecycle
@cleanSensitiveData()
private async processSecretData(secret: string): Promise<void> {
  const sensitiveBytes = new Uint8Array(/* ... */);

  try {
    // Use sensitive data
    await performOperation(sensitiveBytes);
  } finally {
    // Always clear sensitive data
    clearSensitiveArray(sensitiveBytes);
  }
}
```

### Input Validation

```typescript
// Comprehensive validation at all entry points
public async transfer(params: TransferParams): Promise<string> {
  // Validate all inputs before processing
  assertValidAddressForTransaction(
    params.recipientAddress,
    validator,
    this.chainName
  );
  assertValidTransferAmount(params.amount, this.chainName);

  // Proceed with validated inputs
  return this.transferImpl(params);
}
```

### Error Security

- **Information Disclosure**: Never expose internal details in errors
- **Sensitive Data**: Automatic redaction from error objects
- **Stack Traces**: Sanitized for production environments
- **Logging**: Secure logging practices with level-appropriate detail

## Common Patterns and Examples

### Adding a New Asset Handler

```typescript
// 1. Extend BaseAssetHandler
export class NewTokenHandler extends BaseAssetHandler {
  getAssetType(): ChainAssetType {
    return ChainAssetType.NEW_TOKEN;
  }

  @ChainRetry()
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    // Implementation without try-catch (handled by decorators)
    const balance = await this.queryBalance(params.address);
    return new BigNumber(balance.toString());
  }

  async transfer(params: TransferParams): Promise<string> {
    // Validate specific requirements for this token type
    this.validateTokenSpecificRequirements(params);

    // Perform transfer
    const txHash = await this.performTransfer(params);
    return txHash;
  }

  async estimateFee(params: TransferParams): Promise<BigNumber> {
    // Implementation
  }

  cleanup(): void {
    // Clean up resources
  }
}

// 2. Register in wallet
private initAssetHandlers(): void {
  const newTokenHandler = new NewTokenHandler(this.connectionManager, this.logger);
  this.assetHandlers.set(ChainAssetType.NEW_TOKEN, newTokenHandler);
}
```

### Implementing Chain-Specific Configuration

```typescript
// config.ts - Chain-specific settings
export const CHAIN_CONFIG = {
  CHAIN: ChainType.NewChain,
  CHAIN_NAME: 'New Blockchain',
  DERIVING_PATH: "m/44'/999'/0'/0'/0'",
  // Chain-specific constants
  BLOCK_TIME: 2000, // ms
  CONFIRMATION_BLOCKS: 6
} as const;

// Chain-specific retry patterns
export const NewChainRetry = createChainRetry(CHAIN_CONFIG.CHAIN_NAME, ['timeout', 'network', 'rpc'], {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 5000
});

// Cache configuration
export const CACHE_CONFIG = {
  TTL: {
    BALANCE: 30 * 1000, // 30 seconds - real-time data
    FEE: 5 * 60 * 1000, // 5 minutes - relatively stable
    METADATA: 30 * 60 * 1000 // 30 minutes - static data
  },
  SIZE: {
    CONNECTIONS: 10,
    METADATA: 100
  }
} as const;
```

This comprehensive guide ensures consistent, secure, and maintainable code across all packages in the Hibit ID SDK monorepo.
