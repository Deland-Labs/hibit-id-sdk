# @delandlabs/coin-ethereum

EVM-compatible blockchain integration for Hibit ID SDK, supporting Ethereum and all EVM-based chains.

## Features

- ✅ **Multi-EVM Support**: Ethereum, BSC, Base, Avalanche, Scroll, and more
- ✅ **Native & Token Support**: ETH/BNB + ERC20 tokens
- ✅ **Gas Optimization**: Dynamic gas price estimation with caching
- ✅ **Security**: Built-in sensitive data protection with `@cleanSensitiveData`
- ✅ **TypeScript**: Full type safety and IntelliSense support

## Supported Networks

### Mainnet

- Ethereum (ETH)
- BNB Smart Chain (BNB)
- Base (ETH)
- Avalanche (AVAX)
- Scroll (ETH)
- Bitlayer (BTR)
- Panta
- Neo X (GAS)

### Testnet

- Ethereum Sepolia
- BSC Testnet
- Base Sepolia
- Avalanche Fuji
- Scroll Sepolia
- Bitlayer Testnet
- Neo X Testnet
- Kasplex L2 Testnet

## Installation

```bash
# Usually installed as part of the main SDK
npm install @delandlabs/hibit-id-sdk

# For direct usage (advanced)
npm install @delandlabs/coin-ethereum
```

## Usage

### Basic Wallet Operations

```typescript
import { EthereumChainWallet } from '@delandlabs/coin-ethereum';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';

// Initialize wallet
const wallet = new EthereumChainWallet(chainInfo, mnemonic, {
  logger: console // optional
});

// Get account information
const account = await wallet.getAccount();
console.log('Address:', account.address);

// Check native balance (ETH/BNB)
const balance = await wallet.balanceOf({
  address: account.address,
  token: { assetType: ChainAssetType.Native }
});

// Transfer native tokens
const txHash = await wallet.transfer({
  recipientAddress: '0x...',
  amount: '0.1',
  token: { assetType: ChainAssetType.Native }
});
```

### ERC20 Token Operations

```typescript
// Check ERC20 token balance
const tokenBalance = await wallet.balanceOf({
  address: account.address,
  token: {
    assetType: ChainAssetType.ERC20,
    contractAddress: '0x...', // USDC, USDT, etc.
    decimals: 6
  }
});

// Transfer ERC20 tokens
const txHash = await wallet.transfer({
  recipientAddress: '0x...',
  amount: '100',
  token: {
    assetType: ChainAssetType.ERC20,
    contractAddress: '0x...',
    decimals: 6
  }
});

// Estimate transaction fee
const fee = await wallet.estimateFee({
  recipientAddress: '0x...',
  amount: '100',
  token: { assetType: ChainAssetType.ERC20, contractAddress: '0x...' }
});
```

### Message Signing

```typescript
// Sign a message
const signature = await wallet.signMessage({
  message: 'Hello Web3!',
  deterministic: true // optional, defaults to true
});
```

### Transaction Confirmation

```typescript
// Wait for transaction confirmation
const result = await wallet.waitForConfirmation({
  txHash: '0x...',
  requiredConfirmations: 3,
  timeoutMs: 300000, // 5 minutes
  onConfirmationUpdate: (current, required) => {
    console.log(`Confirmations: ${current}/${required}`);
  }
});

if (result.isConfirmed) {
  console.log('Transaction confirmed!');
  console.log('Gas used:', result.gasUsed?.toString());
  console.log('Transaction fee:', result.transactionFee?.toString());
}
```

## Architecture

### Strategy Pattern

The wallet uses the Strategy Pattern to handle different asset types:

- **EthNativeHandler**: Handles ETH/BNB native token operations
- **Erc20TokenHandler**: Handles ERC20 token operations

### Shared Services

- **ConnectionManager**: Manages ethers.js provider connections
- **Gas Price Caching**: Optimized gas price fetching with TTL cache

### Security Features

- **@cleanSensitiveData**: Automatically sanitizes sensitive data from error logs
- **@withLogging**: Comprehensive operation logging
- **@withErrorHandling**: Standardized error handling

## Configuration

### Chain Configuration

```typescript
import { ChainInfo, ChainId, ChainNetwork } from '@delandlabs/hibit-basic-types';

const ethereumMainnet: ChainInfo = {
  chainId: new ChainId(ChainType.EVM, ChainNetwork.EthereumMainNet),
  rpc: {
    primary: 'https://eth-mainnet.alchemyapi.io/v2/your-key',
    fallback: ['https://cloudflare-eth.com']
  }
};
```

### Custom Logger

```typescript
const wallet = new EthereumChainWallet(chainInfo, mnemonic, {
  logger: {
    debug: (msg, ...args) => console.debug(msg, ...args),
    info: (msg, ...args) => console.info(msg, ...args),
    warn: (msg, ...args) => console.warn(msg, ...args),
    error: (msg, ...args) => console.error(msg, ...args)
  }
});
```

## Error Handling

```typescript
import {
  NetworkError,
  InsufficientBalanceError,
  HibitIdSdkErrorCode
} from '@delandlabs/coin-base';

try {
  await wallet.transfer({...});
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.error('Insufficient balance for transaction');
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  }
}
```

## Gas Price Strategy

The wallet implements intelligent gas price management:

1. **Dynamic Pricing**: Fetches current gas prices from the network
2. **Caching**: 30-second TTL cache to reduce RPC calls
3. **Fallback**: Uses EIP-1559 (Type 2) transactions where supported
4. **Optimization**: Automatic gas limit estimation

## Development

### Building

```bash
pnpm build:coin-ethereum
```

### Testing

```bash
pnpm test:coin-ethereum
```

### Security Linting

```bash
# Check for sensitive data leaks
pnpm lint packages/coin-ethereum/src/**/*.ts
```

## Dependencies

- **ethers**: Ethereum library for blockchain interactions
- **@delandlabs/coin-base**: Base wallet functionality
- **@delandlabs/crypto-lib**: Cryptographic utilities
- **@delandlabs/hibit-basic-types**: Type definitions

## Contributing

When contributing to this package:

1. Follow the existing patterns (Strategy Pattern, decorators)
2. Add comprehensive tests for new features
3. Use `@cleanSensitiveData` for methods handling sensitive data
4. Update type definitions for any API changes

## License

MIT License - see LICENSE file for details.
