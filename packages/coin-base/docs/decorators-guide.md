# Decorators Usage Guide

This guide covers all the decorators available in the `@delandlabs/coin-base` package and how to use them effectively.

## Overview

The package provides several decorators that implement cross-cutting concerns:

- `@withLogging` - Automatic method logging with context
- `@cleanSensitiveData` - Automatic sensitive data redaction
- `@withErrorHandling` - Consistent error wrapping and context
- `@Retry` - Automatic retry with exponential backoff
- `@Cacheable` - Method result caching
- `@Memoize` - Input-based memoization

## @withLogging

Automatically logs method entry, exit, and errors with configurable context extraction.

### Basic Usage

```typescript
import { withLogging } from '@delandlabs/coin-base';

class MyWallet extends BaseChainWallet {
  @withLogging('Get account information')
  async getAccount(): Promise<ChainAccount> {
    // Implementation
  }
}
```

### With Context Extraction

```typescript
@withLogging(
  'Transfer tokens',
  // Extract context from method arguments
  (args: [TransferParams]) => ({
    to: args[0].recipientAddress,
    amount: args[0].amount.toString(),
    token: args[0].token.symbol
  }),
  // Extract context from result
  (result: string) => ({ txHash: result })
)
async transfer(params: TransferParams): Promise<string> {
  return await this.transferImpl(params);
}
```

### Advanced Usage with Sensitive Data

```typescript
@withLogging(
  'Sign message',
  (args: [SignMessageParams]) => ({
    // Only log first 50 characters of message
    message: args[0].message.substring(0, 50) + '...'
  }),
  (result: Uint8Array) => ({ signatureLength: result.length })
)
async signMessage(params: SignMessageParams): Promise<Uint8Array> {
  return await this.signMessageImpl(params);
}
```

## @cleanSensitiveData

Automatically removes sensitive information from error objects before they are thrown or logged.

### Basic Usage

```typescript
import { cleanSensitiveData } from '@delandlabs/coin-base';

class MyWallet extends BaseChainWallet {
  @cleanSensitiveData()
  async signMessage(params: SignMessageParams): Promise<Uint8Array> {
    // Even if this throws an error with sensitive data,
    // it will be automatically redacted
    throw new Error(`Failed with mnemonic: ${mnemonic}`);
    // Error will show: "Failed with mnemonic: [REDACTED]"
  }
}
```

### What Gets Redacted

The decorator automatically detects and redacts:

- **Mnemonic phrases** (12 or 24 word sequences)
- **Private keys** (hex strings matching private key patterns)
- **Properties with sensitive names** (mnemonic, privateKey, secret, password, seed)
- **Nested objects** containing sensitive data

### Example: Complex Error Object

```typescript
@cleanSensitiveData()
async complexOperation(): Promise<void> {
  const error = new Error('Operation failed');
  (error as any).details = {
    mnemonic: 'word1 word2 word3...', // Will be [REDACTED]
    privateKey: '0x123...abc',        // Will be [REDACTED]
    publicKey: '0x456...def',         // Will remain
    userId: 'user123'                 // Will remain
  };
  throw error;
}
```

## @withErrorHandling

Wraps errors in appropriate `WalletError` subclasses with chain context.

### Basic Usage

```typescript
import { withErrorHandling } from '@delandlabs/coin-base';

class MyWallet extends BaseChainWallet {
  @withErrorHandling({ errorType: 'transaction' }, 'Failed to transfer tokens')
  async transfer(params: TransferParams): Promise<string> {
    // Any error thrown here will be wrapped as TransactionError
    // with chain name and context
    throw new Error('RPC failed');
    // Results in: TransactionError: "MyChain: Failed to transfer tokens - RPC failed"
  }
}
```

### Error Types

```typescript
// Different error types for different operations
@withErrorHandling({ errorType: 'signing' }, 'Failed to sign message')
async signMessage(params: SignMessageParams): Promise<Uint8Array> { }

@withErrorHandling({ errorType: 'balance' }, 'Failed to query balance')
async balanceOf(params: BalanceQueryParams): Promise<BigNumber> { }

@withErrorHandling({ errorType: 'fee' }, 'Failed to estimate fee')
async estimateFee(params: TransferParams): Promise<BigNumber> { }

@withErrorHandling({ errorType: 'general' }, 'Operation failed')
async genericOperation(): Promise<void> { }
```

### With Additional Context

```typescript
@withErrorHandling(
  {
    errorType: 'transaction',
    context: { operation: 'swap', protocol: 'uniswap' }
  },
  'Failed to execute swap'
)
async executeSwap(params: SwapParams): Promise<string> { }
```

## @Retry

Automatically retries failed operations with exponential backoff.

### Basic Usage

```typescript
import { Retry } from '@delandlabs/coin-base';

class MyWallet extends BaseChainWallet {
  @Retry({ retries: 3, minTimeout: 1000 })
  async queryBalance(address: string): Promise<BigNumber> {
    // Will retry up to 3 times with 1s initial delay
    return await this.rpcCall('getBalance', [address]);
  }
}
```

### Advanced Configuration

```typescript
@Retry({
  retries: 5,
  minTimeout: 1000,      // 1 second initial delay
  maxTimeout: 10000,     // Maximum 10 seconds delay
  factor: 2,             // Double delay each retry
  randomize: true,       // Add random jitter
  chainName: 'MyChain',
  errorPatterns: ['rate limit', 'too many requests'],
  shouldRetry: (error) => {
    // Custom retry logic
    return error.message.includes('temporary');
  }
})
async complexRpcCall(): Promise<any> {
  return await this.rpc.call('complex_method');
}
```

### Chain-Specific Retry

```typescript
import { createChainRetry } from '@delandlabs/coin-base';

// Create pre-configured retry decorator for Ethereum
const EthereumRetry = createChainRetry('Ethereum', ['gas', 'nonce', 'replacement transaction underpriced'], {
  retries: 5,
  minTimeout: 2000
});

class EthereumWallet extends BaseChainWallet {
  @EthereumRetry({ retries: 3 }) // Override default retries
  async sendTransaction(tx: Transaction): Promise<string> {
    return await this.web3.sendTransaction(tx);
  }
}
```

## @Cacheable

Caches method results for a specified time period.

### Basic Usage

```typescript
import { Cacheable } from '@delandlabs/coin-base';

class MyWallet extends BaseChainWallet {
  @Cacheable({ ttl: 300000 }) // Cache for 5 minutes
  async getChainInfo(): Promise<ChainInfo> {
    // Expensive operation that rarely changes
    return await this.fetchChainInfo();
  }
}
```

### With Custom Cache Key

```typescript
@Cacheable({
  ttl: 60000, // 1 minute
  key: (args: [string]) => `balance_${args[0]}` // Custom cache key
})
async getTokenBalance(tokenAddress: string): Promise<BigNumber> {
  return await this.rpc.call('getTokenBalance', [tokenAddress]);
}
```

## @Memoize

Memoizes function results based on input parameters.

### Basic Usage

```typescript
import { Memoize } from '@delandlabs/coin-base';

class MyWallet extends BaseChainWallet {
  @Memoize()
  deriveAddress(hdPath: string): string {
    // Expensive cryptographic operation
    return this.cryptoLib.deriveAddress(this.masterKey, hdPath);
  }
}
```

### With Custom Resolver

```typescript
@Memoize({
  resolver: (hdPath: string, accountIndex: number) => `${hdPath}_${accountIndex}`
})
deriveKeyPair(hdPath: string, accountIndex: number): KeyPair {
  return this.cryptoLib.deriveKeyPair(this.masterKey, hdPath, accountIndex);
}
```

## Decorator Combinations

### Common Patterns

```typescript
class MyWallet extends BaseChainWallet {
  // Comprehensive protection for critical operations
  @withLogging('Transfer tokens')
  @cleanSensitiveData()
  @withErrorHandling({ errorType: 'transaction' }, 'Failed to transfer')
  @Retry({ retries: 3 })
  async transfer(params: TransferParams): Promise<string> {
    return await this.transferImpl(params);
  }

  // Network operations with retry and logging
  @withLogging('Query balance')
  @Retry({ retries: 5, errorPatterns: ['network', 'timeout'] })
  @withErrorHandling({ errorType: 'balance' }, 'Failed to query balance')
  async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    return await this.balanceOfImpl(params);
  }

  // Cached expensive operations
  @withLogging('Get account')
  @Cacheable({ ttl: 300000 }) // 5 minutes
  @withErrorHandling({ errorType: 'general' }, 'Failed to get account')
  async getAccount(): Promise<ChainAccount> {
    return await this.getAccountImpl();
  }
}
```

### Order Matters

The order of decorators is important. Generally follow this pattern:

1. `@withLogging` (outermost - logs everything)
2. `@cleanSensitiveData` (clean errors before they bubble up)
3. `@withErrorHandling` (wrap errors with context)
4. `@Retry` (retry logic)
5. `@Cacheable` or `@Memoize` (innermost - actual caching)

```typescript
@withLogging('Operation')          // 1. Log everything
@cleanSensitiveData()             // 2. Clean sensitive data
@withErrorHandling(config, msg)   // 3. Wrap errors
@Retry({ retries: 3 })           // 4. Retry on failure
@Cacheable({ ttl: 60000 })       // 5. Cache results
async operation(): Promise<Result> {
  return await this.performOperation();
}
```

## Best Practices

### 1. Use Appropriate Error Types

```typescript
// ✅ Good - specific error type
@withErrorHandling({ errorType: 'transaction' }, 'Failed to transfer')

// ❌ Bad - generic error type for specific operation
@withErrorHandling({ errorType: 'general' }, 'Failed to transfer')
```

### 2. Configure Retry for Network Operations

```typescript
// ✅ Good - retry for network calls
@Retry({ retries: 3, errorPatterns: ['network', 'timeout'] })
async rpcCall(): Promise<any> { }

// ❌ Bad - retry for validation errors
@Retry({ retries: 3 })
async validateAddress(address: string): boolean { }
```

### 3. Cache Stable Data Only

```typescript
// ✅ Good - chain info rarely changes
@Cacheable({ ttl: 300000 })
async getChainInfo(): Promise<ChainInfo> { }

// ❌ Bad - balance changes frequently
@Cacheable({ ttl: 300000 })
async getBalance(): Promise<BigNumber> { }
```

### 4. Always Clean Sensitive Data

```typescript
// ✅ Good - protect sensitive operations
@cleanSensitiveData()
async signTransaction(): Promise<string> { }

// ❌ Bad - missing protection for sensitive operation
async signTransaction(): Promise<string> { }
```

### 5. Provide Meaningful Log Messages

```typescript
// ✅ Good - descriptive message
@withLogging('Transfer ERC20 tokens')

// ❌ Bad - vague message
@withLogging('Do operation')
```

## Troubleshooting

### Common Issues

1. **Decorators not working**: Ensure `reflect-metadata` is imported
2. **Cache not clearing**: Call `destroy()` to cleanup resources
3. **Retry not triggering**: Check `shouldRetry` function logic
4. **Logs not appearing**: Verify logger configuration
5. **Sensitive data still showing**: Check error object structure

### Debug Tips

```typescript
// Enable debug logging to see decorator behavior
const logger = new ConsoleLogger(LogLevel.DEBUG, 'MyWallet');

// Check if cache is working
@Cacheable({ ttl: 10000 })
async operation(): Promise<string> {
  console.log('This should only appear once per 10 seconds');
  return 'result';
}
```
