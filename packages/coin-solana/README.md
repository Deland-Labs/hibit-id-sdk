# @delandlabs/coin-solana

Solana blockchain integration for Hibit ID SDK, supporting SOL and SPL tokens.

## Features

- ✅ **Native SOL Support**: Solana native token operations
- ✅ **SPL Token Support**: Full SPL token standard support
- ✅ **Priority Fees**: Dynamic priority fee optimization
- ✅ **Transaction Simulation**: Pre-flight transaction validation
- ✅ **Memo Support**: Transaction memo attachments
- ✅ **Security**: Built-in sensitive data protection

## Supported Networks

- **Mainnet**: Solana Mainnet (SOL)
- **Testnet**: Solana Testnet
- **Devnet**: Solana Devnet (development)

## Installation

```bash
# Usually installed as part of the main SDK
npm install @delandlabs/hibit-id-sdk

# For direct usage (advanced)
npm install @delandlabs/coin-solana
```

## Usage

### Basic Wallet Operations

```typescript
import { SolanaChainWallet } from '@delandlabs/coin-solana';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';

// Initialize wallet
const wallet = new SolanaChainWallet(chainInfo, mnemonic, {
  logger: console // optional
});

// Get account information
const account = await wallet.getAccount();
console.log('Address:', account.address);
console.log('Public Key:', account.publicKey);

// Check SOL balance
const balance = await wallet.balanceOf({
  address: account.address,
  token: { assetType: ChainAssetType.Native }
});

// Transfer SOL
const txHash = await wallet.transfer({
  recipientAddress: '...',
  amount: '0.1',
  token: { assetType: ChainAssetType.Native }
});
```

### SPL Token Operations

```typescript
// Check SPL token balance
const tokenBalance = await wallet.balanceOf({
  address: account.address,
  token: {
    assetType: ChainAssetType.SPL,
    contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    decimals: 6
  }
});

// Transfer SPL tokens
const txHash = await wallet.transfer({
  recipientAddress: '...',
  amount: '100',
  token: {
    assetType: ChainAssetType.SPL,
    contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6
  }
});

// Estimate transaction fee
const fee = await wallet.estimateFee({
  recipientAddress: '...',
  amount: '100',
  token: { assetType: ChainAssetType.SPL, contractAddress: '...' }
});
```

### Message Signing

```typescript
// Sign a message (always deterministic on Solana)
const signature = await wallet.signMessage({
  message: 'Hello Solana!',
  deterministic: true
});
```

### Transaction Confirmation

```typescript
// Wait for transaction confirmation
const result = await wallet.waitForConfirmation({
  txHash: '...',
  requiredConfirmations: 1, // Solana uses commitment levels
  timeoutMs: 60000,
  onConfirmationUpdate: (current, required) => {
    console.log(`Confirmations: ${current}/${required}`);
  }
});

if (result.isConfirmed) {
  console.log('Transaction confirmed!');
  console.log('Slot:', result.blockNumber);
  console.log('Transaction fee:', result.transactionFee?.toString(), 'SOL');
}
```

## Architecture

### Solana-Specific Features

#### Commitment Levels

Solana uses commitment levels instead of traditional confirmations:

- **Processed** (1 confirmation): Transaction processed by a leader
- **Confirmed** (3 confirmations): Confirmed by cluster
- **Finalized** (10+ confirmations): Finalized and irreversible

#### Priority Fees

- Dynamic priority fee calculation based on network congestion
- Automatic fee adjustment for faster transaction processing
- Priority fee caching to reduce RPC calls

### Strategy Pattern

- **SolNativeHandler**: Handles SOL native token operations
- **SplTokenHandler**: Handles SPL token operations

### Connection Management

- **Connection pooling**: Optimized RPC connection management
- **Endpoint failover**: Automatic failover to backup RPC endpoints
- **Rate limiting**: Built-in rate limiting for RPC calls

## Configuration

### Chain Configuration

```typescript
import { ChainInfo, ChainId, ChainNetwork } from '@delandlabs/hibit-basic-types';

const solanaMainnet: ChainInfo = {
  chainId: new ChainId(ChainType.Solana, ChainNetwork.SolanaMainNet),
  rpc: {
    primary: 'https://api.mainnet-beta.solana.com',
    fallback: ['https://solana-api.projectserum.com', 'https://rpc.ankr.com/solana']
  }
};
```

### Priority Fee Configuration

```typescript
// Priority fees are automatically calculated, but can be customized
const wallet = new SolanaChainWallet(chainInfo, mnemonic, {
  logger: console
  // Custom priority fee strategy can be implemented here
});
```

## Error Handling

```typescript
import {
  NetworkError,
  InsufficientBalanceError,
  SolanaError
} from '@delandlabs/coin-base';

try {
  await wallet.transfer({...});
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.error('Insufficient SOL balance for transaction');
  } else if (error instanceof NetworkError) {
    console.error('Solana network error:', error.message);
  }
}
```

## SPL Token Support

### Popular SPL Tokens

```typescript
// USDC
const USDC = {
  assetType: ChainAssetType.SPL,
  contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  decimals: 6
};

// USDT
const USDT = {
  assetType: ChainAssetType.SPL,
  contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  decimals: 6
};

// RAY (Raydium)
const RAY = {
  assetType: ChainAssetType.SPL,
  contractAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  decimals: 6
};
```

### Token Account Management

The wallet automatically handles:

- **Associated Token Account (ATA)** creation
- **Token account rent** calculation
- **Account cleanup** for zero balances

## Fee Structure

### SOL Transfers

- **Base fee**: ~5,000 lamports (0.000005 SOL)
- **Priority fee**: Dynamic based on network congestion

### SPL Token Transfers

- **Base fee**: ~5,000 lamports
- **Priority fee**: Dynamic
- **ATA creation**: ~2,039,280 lamports (one-time, if needed)

## Development

### Building

```bash
pnpm build:coin-solana
```

### Testing

```bash
pnpm test:coin-solana
```

### Security Linting

```bash
pnpm lint packages/coin-solana/src/**/*.ts
```

## Dependencies

- **@solana/web3.js**: Solana JavaScript SDK
- **@delandlabs/coin-base**: Base wallet functionality
- **@delandlabs/crypto-lib**: Ed25519 key derivation
- **tweetnacl**: NaCl cryptography for signing

## Performance Optimizations

1. **Connection Pooling**: Reuse RPC connections
2. **Transaction Simulation**: Pre-validate transactions
3. **Priority Fee Caching**: Cache priority fees for 30 seconds
4. **Batch RPC Calls**: Combine multiple RPC requests where possible

## Contributing

When contributing to this package:

1. Test on both mainnet and devnet
2. Consider Solana's unique features (commitment levels, priority fees)
3. Add comprehensive tests for SPL token operations
4. Use `@cleanSensitiveData` for sensitive methods

## License

MIT License - see LICENSE file for details.
