# Error Handling Guide

This guide covers the comprehensive error handling system in `@delandlabs/coin-base` and best practices for implementing robust error management in blockchain wallet applications.

## Overview

The package provides a structured error hierarchy that:

- **Categorizes errors** by type (mnemonic, network, transaction, etc.)
- **Preserves context** for debugging and user feedback
- **Protects sensitive data** from leaking in error messages
- **Supports error recovery** strategies
- **Integrates with logging** systems

## Error Hierarchy

```
WalletError (abstract base)
├── MnemonicError
├── NetworkError
├── TransactionError
├── BalanceQueryError
├── FeeEstimationError
├── MessageSigningError
└── GeneralWalletError
```

## Error Classes

### WalletError (Base Class)

All wallet errors inherit from this base class:

```typescript
import { WalletError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

// Base properties available on all errors
interface WalletErrorProperties {
  code: HibitIdSdkErrorCode; // Structured error code
  message: string; // Human-readable message
  details?: object; // Additional context
  cause?: Error; // Original error (if wrapped)
  timestamp: Date; // When error occurred
}
```

### MnemonicError

For mnemonic-related operations (validation, derivation):

```typescript
import { MnemonicError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

// Example: Invalid mnemonic validation
try {
  validateMnemonic('invalid mnemonic');
} catch (error) {
  if (error instanceof MnemonicError) {
    console.log(error.code); // INVALID_MNEMONIC
    console.log(error.details?.wordCount); // 2 (expected 12 or 24)
  }
}

// Creating custom mnemonic errors
throw new MnemonicError(HibitIdSdkErrorCode.MNEMONIC_DERIVATION_FAILED, 'Failed to derive key from mnemonic', {
  derivationPath: "m/44'/60'/0'/0/0",
  wordCount: 12
});
```

### ArgumentError

For parameter validation errors:

```typescript
import { ArgumentError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

// Example: Missing required parameter
throw new ArgumentError(
  HibitIdSdkErrorCode.INVALID_ARGUMENT,
  'Missing required parameter',
  {
    argumentName: 'assetType',
    expectedType: 'ChainAssetType',
    actualType: 'undefined'
  }
);
```

### NetworkError

For network and RPC-related failures:

```typescript
import { NetworkError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

// Example: RPC timeout
throw new NetworkError(
  HibitIdSdkErrorCode.NETWORK_TIMEOUT,
  'RPC request timed out',
  'https://mainnet.infura.io/v3/...', // endpoint
  {
    timeout: 5000,
    retryCount: 3,
    method: 'eth_getBalance'
  }
);

// Example: Network unavailable
throw new NetworkError(
  HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
  'Unable to connect to blockchain network',
  'https://rpc.ankr.com/eth',
  {
    statusCode: 503,
    retryAfter: 60
  }
);
```

### TransactionError

For transaction-related operations:

```typescript
import { TransactionError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

// Example: Insufficient balance
throw new TransactionError(
  HibitIdSdkErrorCode.INSUFFICIENT_BALANCE,
  'Insufficient balance for transaction',
  undefined, // no transaction hash yet
  {
    required: '1.5',
    available: '0.8',
    token: 'ETH'
  }
);

// Example: Transaction failed
throw new TransactionError(
  HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED,
  'Transaction was reverted',
  '0x1234...abcd', // transaction hash
  {
    gasUsed: '21000',
    gasLimit: '21000',
    revertReason: 'Transfer amount exceeds balance'
  }
);
```

### BalanceQueryError

For balance and token query operations:

```typescript
import { BalanceQueryError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

// Example: Invalid token contract
throw new BalanceQueryError(
  HibitIdSdkErrorCode.INVALID_ASSET_IDENTIFIER,
  'Token contract not found',
  '0x1234...abcd', // wallet address
  '0x5678...efgh', // asset identifier
  {
    chainId: 1,
    blockNumber: 18500000
  }
);
```

### FeeEstimationError

For gas and fee estimation failures:

```typescript
import { FeeEstimationError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

// Example: Gas estimation failed
throw new FeeEstimationError(HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED, 'Unable to estimate transaction fee', {
  gasLimit: 'unknown',
  gasPrice: '20000000000',
  reason: 'execution reverted'
});
```

### MessageSigningError

For message signing operations:

```typescript
import { MessageSigningError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

// Example: Signing failed
throw new MessageSigningError(
  HibitIdSdkErrorCode.MESSAGE_SIGNING_FAILED,
  'Failed to sign message',
  undefined, // no signature produced
  {
    messageLength: 256,
    algorithm: 'ECDSA',
    curve: 'secp256k1'
  }
);
```

## Error Codes

The `HibitIdSdkErrorCode` enum provides structured error identification:

```typescript
enum HibitIdSdkErrorCode {
  // --- User Interaction & Connection Errors ---
  USER_CANCEL_CONNECTION = 'USER_CANCEL_CONNECTION',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',

  // --- Mnemonic & Key Errors ---
  INVALID_MNEMONIC = 'INVALID_MNEMONIC',
  MNEMONIC_DERIVATION_FAILED = 'MNEMONIC_DERIVATION_FAILED',

  // --- Network Communication Errors ---
  NETWORK_REQUEST_FAILED = 'NETWORK_REQUEST_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',

  // --- Chain Operation Errors ---
  TRANSACTION_SIGNING_FAILED = 'TRANSACTION_SIGNING_FAILED',
  TRANSACTION_BROADCAST_FAILED = 'TRANSACTION_BROADCAST_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  FEE_ESTIMATION_FAILED = 'FEE_ESTIMATION_FAILED',
  BALANCE_QUERY_FAILED = 'BALANCE_QUERY_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

  // --- Parameter & Input Validation Errors ---
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  INVALID_ASSET_IDENTIFIER = 'INVALID_ASSET_IDENTIFIER',
  UNSUPPORTED_ASSET_TYPE = 'UNSUPPORTED_ASSET_TYPE',
  INVALID_RECIPIENT_ADDRESS = 'INVALID_RECIPIENT_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  INVALID_DERIVATION_PATH = 'INVALID_DERIVATION_PATH',

  // --- System & General Errors ---
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED'
}
```

## Error Handling Patterns

### 1. Basic Error Handling

```typescript
import { TransactionError, BalanceQueryError } from '@delandlabs/coin-base';

async function handleTransfer(wallet: BaseChainWallet, params: TransferParams) {
  try {
    const txHash = await wallet.transfer(params);
    return { success: true, txHash };
  } catch (error) {
    if (error instanceof TransactionError) {
      return {
        success: false,
        errorType: 'transaction',
        code: error.code,
        message: error.message,
        details: error.details
      };
    } else if (error instanceof BalanceQueryError) {
      return {
        success: false,
        errorType: 'balance',
        code: error.code,
        message: error.message
      };
    } else {
      return {
        success: false,
        errorType: 'unknown',
        message: 'An unexpected error occurred'
      };
    }
  }
}
```

### 2. Error Recovery Strategies

```typescript
import { NetworkError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

async function robustRpcCall(rpcCall: () => Promise<any>): Promise<any> {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await rpcCall();
    } catch (error) {
      lastError = error;

      if (error instanceof NetworkError) {
        switch (error.code) {
          case HibitIdSdkErrorCode.NETWORK_TIMEOUT:
            // Retry with exponential backoff
            await delay(Math.pow(2, attempt) * 1000);
            continue;

          case HibitIdSdkErrorCode.NETWORK_UNAVAILABLE:
            // Try fallback RPC endpoint
            if (attempt < maxRetries) {
              switchToFallbackRpc();
              continue;
            }
            break;

          default:
            // Don't retry for other network errors
            break;
        }
      }

      // Don't retry for non-network errors
      break;
    }
  }

  throw lastError;
}
```

### 3. User-Friendly Error Messages

```typescript
import { WalletError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

function getUserFriendlyMessage(error: Error): string {
  if (!(error instanceof WalletError)) {
    return 'An unexpected error occurred. Please try again.';
  }

  switch (error.code) {
    case HibitIdSdkErrorCode.INSUFFICIENT_BALANCE:
      return "You don't have enough balance to complete this transaction.";

    case HibitIdSdkErrorCode.NETWORK_TIMEOUT:
      return 'Network request timed out. Please check your internet connection and try again.';

    case HibitIdSdkErrorCode.INVALID_RECIPIENT_ADDRESS:
      return 'The recipient address is invalid. Please check and try again.';

    case HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED:
      return 'Transaction failed to broadcast. This might be due to network congestion.';

    case HibitIdSdkErrorCode.INVALID_MNEMONIC:
      return 'The recovery phrase is invalid. Please check your input.';

    case HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED:
      return 'Unable to estimate transaction fee. Please try again later.';

    default:
      return `Operation failed: ${error.message}`;
  }
}
```

### 4. Error Logging and Monitoring

```typescript
import { WalletError, ILogger } from '@delandlabs/coin-base';

class ErrorReporter {
  constructor(private logger: ILogger) {}

  reportError(error: Error, context: Record<string, any> = {}) {
    if (error instanceof WalletError) {
      this.logger.error(`Wallet error: ${error.code}`, error, 'ErrorReporter.reportError', {
        errorCode: error.code,
        errorType: error.constructor.name,
        chainName: context.chainName,
        operation: context.operation,
        details: error.details,
        timestamp: error.timestamp.toISOString()
      });

      // Send to monitoring service (without sensitive data)
      this.sendToMonitoring({
        errorCode: error.code,
        errorType: error.constructor.name,
        chainName: context.chainName,
        timestamp: error.timestamp.toISOString()
        // Note: Don't include error.details as it might contain sensitive data
      });
    } else {
      this.logger.error('Unexpected error', error, 'ErrorReporter.reportError', context);
    }
  }

  private sendToMonitoring(errorData: Record<string, any>) {
    // Implementation depends on your monitoring service
    // Examples: Sentry, DataDog, CloudWatch, etc.
  }
}
```

## Custom Error Implementation

### Creating Custom Error Types

```typescript
import { WalletError, HibitIdSdkErrorCode, GeneralErrorDetails } from '@delandlabs/coin-base';

// Define custom error details interface
interface SwapErrorDetails extends GeneralErrorDetails {
  inputToken?: string;
  outputToken?: string;
  inputAmount?: string;
  expectedOutput?: string;
  actualOutput?: string;
  slippage?: number;
}

// Create custom error class
export class SwapError extends WalletError {
  constructor(
    code: HibitIdSdkErrorCode,
    message: string,
    public readonly inputToken?: string,
    public readonly outputToken?: string,
    details?: SwapErrorDetails,
    cause?: Error
  ) {
    super(code, message, details, cause);
  }
}

// Usage
throw new SwapError(
  HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED,
  'Swap transaction failed due to high slippage',
  'USDC',
  'ETH',
  {
    inputAmount: '1000',
    expectedOutput: '0.6',
    actualOutput: '0.55',
    slippage: 8.3
  }
);
```

### Error Wrapping Utility

```typescript
import { wrapError, ErrorHandlerConfig } from '@delandlabs/coin-base';

function wrapChainError(
  error: unknown,
  chainName: string,
  operation: string,
  errorType: 'signing' | 'balance' | 'transaction' | 'fee' | 'general'
): WalletError {
  const config: ErrorHandlerConfig = {
    chainName,
    errorType,
    context: { operation }
  };

  return wrapError(error, config, `Failed to ${operation}`);
}

// Usage
try {
  await someRiskyOperation();
} catch (error) {
  throw wrapChainError(error, 'Ethereum', 'transfer tokens', 'transaction');
}
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// ✅ Good - specific error type
throw new TransactionError(HibitIdSdkErrorCode.INSUFFICIENT_BALANCE, 'Insufficient balance', undefined, {
  required: '1.0',
  available: '0.5'
});

// ❌ Bad - generic error
throw new Error('Insufficient balance');
```

### 2. Include Relevant Context

```typescript
// ✅ Good - includes debugging context
throw new NetworkError(HibitIdSdkErrorCode.NETWORK_TIMEOUT, 'RPC request timed out', endpoint, {
  method: 'eth_getBalance',
  timeout: 5000,
  attempt: 3,
  chainId: 1
});

// ❌ Bad - no context
throw new NetworkError(HibitIdSdkErrorCode.NETWORK_TIMEOUT, 'Request timed out');
```

### 3. Preserve Original Errors

```typescript
// ✅ Good - preserves original error
try {
  await web3.eth.sendTransaction(tx);
} catch (originalError) {
  throw new TransactionError(
    HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED,
    'Failed to broadcast transaction',
    tx.hash,
    { gasLimit: tx.gas, gasPrice: tx.gasPrice },
    originalError // Preserve original error
  );
}

// ❌ Bad - loses original error information
try {
  await web3.eth.sendTransaction(tx);
} catch (originalError) {
  throw new TransactionError(HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED, 'Failed to broadcast transaction');
}
```

### 4. Implement Error Recovery

```typescript
// ✅ Good - implements recovery strategy
async function queryBalanceWithFallback(address: string): Promise<BigNumber> {
  const endpoints = [primaryRpc, fallbackRpc1, fallbackRpc2];

  for (const endpoint of endpoints) {
    try {
      return await queryBalance(endpoint, address);
    } catch (error) {
      if (error instanceof NetworkError && endpoints.length > 1) {
        continue; // Try next endpoint
      }
      throw error; // Re-throw if no more endpoints or non-network error
    }
  }

  throw new NetworkError(HibitIdSdkErrorCode.NETWORK_UNAVAILABLE, 'All RPC endpoints failed');
}

// ❌ Bad - no fallback strategy
async function queryBalance(address: string): Promise<BigNumber> {
  return await rpc.call('getBalance', [address]); // Fails if RPC is down
}
```

### 5. Sanitize Error Messages

```typescript
// ✅ Good - uses decorator for automatic sanitization
@cleanSensitiveData()
async signTransaction(tx: Transaction, privateKey: string): Promise<string> {
  try {
    return await this.cryptoLib.sign(tx, privateKey);
  } catch (error) {
    // Error will be automatically sanitized before being thrown
    throw new Error(`Signing failed with key: ${privateKey}`);
  }
}

// ❌ Bad - manually handling sensitive data
async signTransaction(tx: Transaction, privateKey: string): Promise<string> {
  try {
    return await this.cryptoLib.sign(tx, privateKey);
  } catch (error) {
    // Risk of leaking private key in error message
    throw new Error(`Signing failed with key: ${privateKey}`);
  }
}
```

## Testing Error Scenarios

### Unit Testing Errors

```typescript
import { describe, test, expect } from 'vitest';
import { MnemonicError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

describe('Error Handling', () => {
  test('should throw MnemonicError for invalid mnemonic', () => {
    expect(() => {
      validateMnemonic('invalid');
    }).toThrow(MnemonicError);

    try {
      validateMnemonic('invalid');
    } catch (error) {
      expect(error).toBeInstanceOf(MnemonicError);
      expect((error as MnemonicError).code).toBe(HibitIdSdkErrorCode.INVALID_MNEMONIC);
    }
  });

  test('should preserve error context', async () => {
    const wallet = new TestWallet();

    try {
      await wallet.transfer({
        recipientAddress: 'invalid',
        amount: new BigNumber('100'),
        token: { assetType: ChainAssetType.Native }
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TransactionError);
      expect((error as TransactionError).details).toMatchObject({
        chainName: 'TestChain'
      });
    }
  });
});
```

### Integration Testing with Error Scenarios

```typescript
describe('Network Error Recovery', () => {
  test('should retry on network timeout', async () => {
    const mockRpc = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError(HibitIdSdkErrorCode.NETWORK_TIMEOUT, 'Timeout'))
      .mockRejectedValueOnce(new NetworkError(HibitIdSdkErrorCode.NETWORK_TIMEOUT, 'Timeout'))
      .mockResolvedValueOnce({ balance: '1000000' });

    const result = await retryableRpcCall(mockRpc);

    expect(mockRpc).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ balance: '1000000' });
  });
});
```

## Troubleshooting

### Common Issues

1. **Error not being caught**: Check error instance types and inheritance
2. **Sensitive data in logs**: Ensure `@cleanSensitiveData` decorator is applied
3. **Context missing**: Verify error details are being passed correctly
4. **Stack trace lost**: Make sure to preserve original errors with `cause` parameter

### Debug Techniques

```typescript
// Enable detailed error logging
const logger = new ConsoleLogger(LogLevel.DEBUG, 'ErrorDebug');

// Check error hierarchy
console.log(error instanceof WalletError); // true
console.log(error instanceof TransactionError); // true
console.log(error.constructor.name); // 'TransactionError'

// Inspect error details
console.log(JSON.stringify(error.toJSON(), null, 2));
```
