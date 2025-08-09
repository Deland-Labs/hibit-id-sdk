# @delandlabs/coin-ton

TON (The Open Network) blockchain integration for Hibit ID SDK, supporting native TON and Jetton tokens.

## Features

- ✅ **Native TON Support**: TON native token operations
- ✅ **Jetton Token Support**: Full Jetton standard support
- ✅ **Wallet V4 Contract**: Uses latest TON wallet contract
- ✅ **Dual Key Derivation**: Supports both TON native and Ed25519 derivation
- ✅ **Message Signing**: TON-native message signing

## Supported Networks

- **Mainnet**: TON Mainnet
- **Testnet**: TON Testnet

## Installation

```bash
# Usually installed as part of the main SDK
npm install @delandlabs/hibit-id-sdk

# For direct usage (advanced)
npm install @delandlabs/coin-ton
```

## Usage

### Basic Wallet Operations

```typescript
import { TonChainWallet } from '@delandlabs/coin-ton';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';

// Initialize wallet
const wallet = new TonChainWallet(chainInfo, mnemonic, {
  keyDerivationMethod: 'ton-native', // or 'ed25519'
  logger: console // optional
});

// Get account information
const account = await wallet.getAccount();
console.log('Address:', account.address);
console.log('Public Key:', account.publicKey);

// Check TON balance
const balance = await wallet.balanceOf({
  address: account.address,
  token: { assetType: ChainAssetType.Native }
});

// Transfer TON
const txHash = await wallet.transfer({
  recipientAddress: 'EQ...',
  amount: '1.5',
  token: { assetType: ChainAssetType.Native }
});
```

### Jetton Token Operations

```typescript
// Check Jetton balance
const jettonBalance = await wallet.balanceOf({
  address: account.address,
  token: {
    assetType: ChainAssetType.Jetton,
    contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', // USDT
    decimals: 6
  }
});

// Transfer Jetton tokens
const txHash = await wallet.transfer({
  recipientAddress: 'EQ...',
  amount: '100',
  token: {
    assetType: ChainAssetType.Jetton,
    contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    decimals: 6
  }
});

// Estimate transaction fee
const fee = await wallet.estimateFee({
  recipientAddress: 'EQ...',
  amount: '100',
  token: { assetType: ChainAssetType.Jetton, contractAddress: '...' }
});
```

### Message Signing

```typescript
// Sign a message (TON native signing)
const signature = await wallet.signMessage({
  message: 'Hello TON!'
});
```

### Transaction Confirmation

```typescript
// Wait for transaction confirmation (uses sequence number increment)
const result = await wallet.waitForConfirmation({
  txHash: '...',
  requiredConfirmations: 1, // TON uses seqno increment
  timeoutMs: 60000,
  onConfirmationUpdate: (current, required) => {
    console.log(`Seqno increments: ${current}/${required}`);
  }
});

if (result.isConfirmed) {
  console.log('Transaction confirmed!');
}
```

## Architecture

### Key Derivation Methods

#### TON Native Derivation (Recommended)

```typescript
const wallet = new TonChainWallet(chainInfo, mnemonic, {
  keyDerivationMethod: 'ton-native' // Uses TON's official derivation
});
```

#### Ed25519 Derivation

```typescript
const wallet = new TonChainWallet(chainInfo, mnemonic, {
  keyDerivationMethod: 'ed25519' // Compatible with other blockchains
});
```

### Strategy Pattern

- **TonNativeHandler**: Handles TON native token operations
- **JettonHandler**: Handles Jetton token operations

### TON-Specific Features

#### Wallet Contract V4

- Uses the latest TON wallet contract (V4)
- Supports batched transactions
- Gas-efficient operations

#### Sequence Number Management

- Automatic sequence number tracking
- Transaction ordering guarantees
- Prevents replay attacks

## Configuration

### Chain Configuration

```typescript
import { ChainInfo, ChainId, ChainNetwork } from '@delandlabs/hibit-basic-types';

const tonMainnet: ChainInfo = {
  chainId: new ChainId(ChainType.Ton, ChainNetwork.TonMainNet),
  rpc: {
    primary: 'https://toncenter.com/api/v2/jsonRPC',
    fallback: ['https://ton-rpc.orbs.com']
  }
};
```

## Error Handling

```typescript
import {
  NetworkError,
  InsufficientBalanceError,
  MessageSigningError
} from '@delandlabs/coin-base';

try {
  await wallet.transfer({...});
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.error('Insufficient TON balance');
  } else if (error instanceof NetworkError) {
    console.error('TON network error:', error.message);
  }
}
```

## Popular Jetton Tokens

```typescript
// USDT (Tether USD)
const USDT = {
  assetType: ChainAssetType.Jetton,
  contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  decimals: 6
};

// NOT (Notcoin)
const NOT = {
  assetType: ChainAssetType.Jetton,
  contractAddress: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
  decimals: 9
};

// DOGS
const DOGS = {
  assetType: ChainAssetType.Jetton,
  contractAddress: 'EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS',
  decimals: 9
};
```

## Fee Structure

### TON Transfers

- **Base fee**: ~0.01 TON
- **Storage fee**: Minimal for simple transfers
- **Gas fees**: Dynamic based on computation

### Jetton Transfers

- **Base fee**: ~0.05 TON (includes Jetton contract interaction)
- **Forward fee**: ~0.01 TON for message forwarding
- **Storage fees**: For maintaining Jetton wallet contracts

## Address Formats

TON uses different address formats:

- **User-friendly**: `EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs`
- **Raw format**: `0:b113a994b5024a1671bf6913932ceb75959b0e2897d420b146feccdc360ddfe`

The wallet automatically handles format conversions.

## Development

### Building

```bash
pnpm build:coin-ton
```

### Testing

```bash
pnpm test:coin-ton
```

### Security Linting

```bash
pnpm lint packages/coin-ton/src/**/*.ts
```

## Dependencies

- **@ton/ton**: Official TON JavaScript SDK
- **@ton/crypto**: TON cryptographic functions
- **@delandlabs/coin-base**: Base wallet functionality
- **@delandlabs/crypto-lib**: Ed25519 key derivation

## Performance Optimizations

1. **RPC Caching**: Cache RPC endpoints with failover
2. **Sequence Number Optimization**: Efficient seqno management
3. **Batch Operations**: Support for batched transactions

## Contributing

When contributing to this package:

1. Test on both mainnet and testnet
2. Ensure wallet functionality
3. Add tests for both key derivation methods
4. Consider TON's unique features (seqno, gas model)

## License

MIT License - see LICENSE file for details.
