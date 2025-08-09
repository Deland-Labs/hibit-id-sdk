# @delandlabs/coin-tron

TRON blockchain integration for Hibit ID SDK, supporting TRX and TRC20 tokens.

## Features

- ✅ **Native TRX Support**: TRON native token operations
- ✅ **TRC20 Token Support**: Full TRC20 standard support
- ✅ **Energy Management**: Efficient energy and bandwidth utilization
- ✅ **Smart Contract Support**: Direct smart contract interactions
- ✅ **Multi-Network**: Mainnet, Shasta, and Nile testnet support
- ✅ **Security**: Built-in sensitive data protection

## Supported Networks

- **Mainnet**: TRON Mainnet (TRX)
- **Shasta Testnet**: TRON Shasta Testnet
- **Nile Testnet**: TRON Nile Testnet

## Installation

```bash
# Usually installed as part of the main SDK
npm install @delandlabs/hibit-id-sdk

# For direct usage (advanced)
npm install @delandlabs/coin-tron
```

## Usage

### Basic Wallet Operations

```typescript
import { TronChainWallet } from '@delandlabs/coin-tron';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';

// Initialize wallet
const wallet = new TronChainWallet(chainInfo, mnemonic, {
  keyDerivationMethod: 'secp256k1', // Standard TRON derivation
  logger: console // optional
});

// Get account information
const account = await wallet.getAccount();
console.log('Address:', account.address);
console.log('Public Key:', account.publicKey);

// Check TRX balance
const balance = await wallet.balanceOf({
  address: account.address,
  token: { assetType: ChainAssetType.Native }
});

// Transfer TRX
const txHash = await wallet.transfer({
  recipientAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  amount: '10',
  token: { assetType: ChainAssetType.Native }
});
```

### TRC20 Token Operations

```typescript
// Check TRC20 token balance
const tokenBalance = await wallet.balanceOf({
  address: account.address,
  token: {
    assetType: ChainAssetType.TRC20,
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT
    decimals: 6
  }
});

// Transfer TRC20 tokens
const txHash = await wallet.transfer({
  recipientAddress: 'TR...',
  amount: '100',
  token: {
    assetType: ChainAssetType.TRC20,
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6
  }
});

// Estimate transaction fee
const fee = await wallet.estimateFee({
  recipientAddress: 'TR...',
  amount: '100',
  token: { assetType: ChainAssetType.TRC20, contractAddress: '...' }
});
```

### Message Signing

```typescript
// Sign a message using TRON's signing method
const signature = await wallet.signMessage({
  message: 'Hello TRON!'
});
```

### Transaction Confirmation

```typescript
// Wait for transaction confirmation
const result = await wallet.waitForConfirmation({
  txHash: '...',
  requiredConfirmations: 1,
  timeoutMs: 60000,
  onConfirmationUpdate: (current, required) => {
    console.log(`Confirmations: ${current}/${required}`);
  }
});

if (result.isConfirmed) {
  console.log('Transaction confirmed!');
  console.log('Block number:', result.blockNumber);
  console.log('Transaction fee:', result.transactionFee?.toString(), 'TRX');
}
```

## Architecture

### TRON-Specific Features

#### Energy and Bandwidth Model

TRON uses a unique resource model:

- **Bandwidth**: Required for all transactions
- **Energy**: Required for smart contract operations
- **TRX Burning**: Alternative to energy/bandwidth consumption

#### Address Format

TRON addresses start with 'T' and are 34 characters long:

- **Base58Check Encoding**: User-friendly format
- **Hex Format**: Internal contract representation
- **Automatic Conversion**: The wallet handles format conversions

### Strategy Pattern

- **TrxNativeHandler**: Handles TRX native token operations
- **Trc20TokenHandler**: Handles TRC20 token operations

### Connection Management

- **TronWeb Integration**: Official TRON JavaScript library
- **Node Selection**: Automatic failover to backup nodes
- **Resource Monitoring**: Energy and bandwidth usage tracking

## Configuration

### Chain Configuration

```typescript
import { ChainInfo, ChainId, ChainNetwork } from '@delandlabs/hibit-basic-types';

const tronMainnet: ChainInfo = {
  chainId: new ChainId(ChainType.Tron, ChainNetwork.TronMainNet),
  rpc: {
    primary: 'https://api.trongrid.io',
    fallback: ['https://api.tronstack.io', 'https://tron-rpc.publicnode.com']
  }
};
```

### Resource Configuration

```typescript
// The wallet automatically manages resources, but you can optimize:
const wallet = new TronChainWallet(chainInfo, mnemonic, {
  // Resource optimization strategies can be configured here
  logger: console
});
```

## Error Handling

```typescript
import {
  NetworkError,
  InsufficientBalanceError,
  TronError
} from '@delandlabs/coin-base';

try {
  await wallet.transfer({...});
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.error('Insufficient TRX balance or energy');
  } else if (error instanceof NetworkError) {
    console.error('TRON network error:', error.message);
  }
}
```

## Popular TRC20 Tokens

```typescript
// USDT (Tether USD)
const USDT = {
  assetType: ChainAssetType.TRC20,
  contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  decimals: 6
};

// USDC (USD Coin)
const USDC = {
  assetType: ChainAssetType.TRC20,
  contractAddress: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
  decimals: 6
};

// BTT (BitTorrent Token)
const BTT = {
  assetType: ChainAssetType.TRC20,
  contractAddress: 'TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4',
  decimals: 18
};

// JST (JUST)
const JST = {
  assetType: ChainAssetType.TRC20,
  contractAddress: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9',
  decimals: 18
};
```

## Fee Structure

### TRX Transfers

- **Bandwidth**: ~345 bandwidth points (free daily allowance: 1,500)
- **Fee**: 0.1 TRX if bandwidth exceeded
- **Energy**: Not required for native transfers

### TRC20 Transfers

- **Bandwidth**: ~345 bandwidth points
- **Energy**: ~14,000-31,000 energy (varies by contract)
- **Fee**: Energy can be paid with TRX (~2.8-6.2 TRX typically)

### Resource Optimization

The wallet automatically optimizes resource usage:

1. Uses free daily bandwidth when available
2. Burns TRX for additional resources when needed
3. Estimates optimal energy consumption

## Smart Contract Interactions

### Direct Contract Calls

```typescript
// The wallet can interact with any TRON smart contract
// TRC20 transfers are automatically handled through contract calls
const result = await wallet.transfer({
  recipientAddress: 'TR...',
  amount: '100',
  token: {
    assetType: ChainAssetType.TRC20,
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
  }
});
```

### Energy Estimation

```typescript
// Estimate energy consumption for contract operations
const feeEstimate = await wallet.estimateFee({
  recipientAddress: 'TR...',
  amount: '100',
  token: { assetType: ChainAssetType.TRC20, contractAddress: '...' }
});

console.log('Estimated fee:', feeEstimate.toString(), 'TRX');
```

## Address Validation

TRON uses strict address validation:

- **Length**: Exactly 34 characters
- **Prefix**: Must start with 'T'
- **Base58Check**: Valid Base58Check encoding
- **Checksum**: Built-in checksum validation

```typescript
// Check if address is valid
const isValid = wallet.isValidAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
console.log('Valid TRON address:', isValid);
```

## Development

### Building

```bash
pnpm build:coin-tron
```

### Testing

```bash
pnpm test:coin-tron
```

### Security Linting

```bash
pnpm lint packages/coin-tron/src/**/*.ts
```

## Dependencies

- **tronweb**: Official TRON JavaScript library
- **@noble/secp256k1**: ECDSA cryptography for key operations
- **@delandlabs/coin-base**: Base wallet functionality
- **@delandlabs/crypto-lib**: ECDSA key derivation

## Network Differences

### Mainnet

- **Chain ID**: 0x2b6653dc (728126428)
- **RPC**: https://api.trongrid.io
- **Explorer**: https://tronscan.org

### Shasta Testnet

- **Chain ID**: 0x94a9059e (2494104990)
- **RPC**: https://api.shasta.trongrid.io
- **Explorer**: https://shasta.tronscan.org
- **Faucet**: https://www.trongrid.io/shasta

### Nile Testnet

- **Chain ID**: 0xcd8690dc (3448148700)
- **RPC**: https://nile.trongrid.io
- **Explorer**: https://nile.tronscan.org

## Performance Optimizations

1. **Connection Pooling**: Reuse TronWeb instances
2. **Resource Caching**: Cache energy/bandwidth calculations
3. **Batch Operations**: Group multiple operations when possible
4. **Automatic Retries**: Handle temporary network issues

## Contributing

When contributing to this package:

1. Test on Shasta testnet before mainnet
2. Consider TRON's unique energy/bandwidth model
3. Add comprehensive tests for TRC20 operations
4. Use `@cleanSensitiveData` for sensitive methods
5. Follow TRON address validation patterns

## License

MIT License - see LICENSE file for details.
