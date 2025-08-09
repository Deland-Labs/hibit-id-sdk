# Testing Guide for coin-ethereum

## waitForConfirmation Testing Solution

### Problem

The `waitForConfirmationImpl` method uses `provider.waitForTransaction()` from ethers.js, which can cause test timeouts if not properly mocked because:

1. **Real Network Calls**: Attempts to connect to actual blockchain networks
2. **Long Wait Times**: Waits for real transaction confirmations (minutes/hours)
3. **Test Timeouts**: Exceeds test framework timeout limits

### Solution

#### 1. Mock the Provider's waitForTransaction Method

```typescript
import { vi } from 'vitest';
import { getWalletInternals } from './test-utils';

// In your test setup
const mockProvider = {
  waitForTransaction: vi.fn(),
  getBlockNumber: vi.fn(),
  _isProvider: true
};

// Mock the connection manager
const internals = getWalletInternals(wallet);
vi.spyOn(internals.connectionManager, 'getProvider').mockReturnValue(mockProvider);
```

#### 2. Mock Different Scenarios

**Successful Confirmation:**

```typescript
const mockReceipt = {
  status: 1, // Success
  blockHash: '0xabcd1234',
  blockNumber: 1000,
  gasUsed: 21000n,
  gasPrice: 20000000000n
};

mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);
mockProvider.getBlockNumber.mockResolvedValue(1002); // 3 confirmations
```

**Failed Transaction:**

```typescript
const mockReceipt = {
  status: 0, // Failed
  blockHash: '0xabcd1234',
  blockNumber: 1000,
  gasUsed: 21000n,
  gasPrice: 20000000000n
};

mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);
```

**Timeout:**

```typescript
mockProvider.waitForTransaction.mockResolvedValue(null); // Timeout
```

**Network Error:**

```typescript
mockProvider.waitForTransaction.mockRejectedValue(new Error('Network error'));
```

#### 3. Test Parameter Passing

Verify that the correct parameters are passed to the underlying ethers.js method:

```typescript
await wallet.waitForConfirmation({
  txHash: testTxHash,
  requiredConfirmations: 6,
  timeoutMs: 600000
});

expect(mockProvider.waitForTransaction).toHaveBeenCalledWith(testTxHash, 6, 600000);
```

#### 4. Test Progress Callbacks

```typescript
const progressCallback = vi.fn();

await wallet.waitForConfirmation({
  txHash: testTxHash,
  onConfirmationUpdate: progressCallback
});

expect(progressCallback).toHaveBeenCalledWith(currentConfirmations, requiredConfirmations);
```

### Key Benefits of This Approach

1. **Fast Tests**: No real network calls, tests complete in milliseconds
2. **Deterministic**: Predictable outcomes for consistent test results
3. **Comprehensive Coverage**: Test all scenarios (success, failure, timeout, errors)
4. **No External Dependencies**: Tests don't depend on network conditions
5. **Proper Error Handling**: Verifies that errors are properly propagated to decorators

### Example Test Structure

See `tests/wait-for-confirmation.test.ts` for a complete example that covers:

- Successful confirmations
- Failed transactions
- Timeout scenarios
- Custom parameters
- Progress callbacks
- Error handling
- Default parameter behavior

### Best Practices

1. **Always Mock Network Calls**: Never make real blockchain calls in unit tests
2. **Test Edge Cases**: Include timeout, error, and boundary condition scenarios
3. **Verify Parameter Passing**: Ensure correct values are passed to underlying methods
4. **Use Realistic Data**: Mock realistic transaction receipts and block numbers
5. **Test Default Behavior**: Verify default values work correctly
6. **Fast Execution**: All tests should complete quickly (< 1 second each)

This solution ensures that `waitForConfirmation` functionality is thoroughly tested without the risk of test timeouts or external dependencies.
