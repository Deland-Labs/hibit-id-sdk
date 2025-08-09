# @delandlabs/coin-kaspa

Kaspa blockchain integration for Hibit ID SDK, supporting KAS and KRC-20 tokens.

## Features

- ✅ **Native KAS Support**: Kaspa native token operations
- ✅ **KRC-20 Token Support**: Full KRC-20 token standard support
- ✅ **UTXO Management**: Efficient UTXO selection and management
- ✅ **High Throughput**: Optimized for Kaspa's blockDAG architecture
- ✅ **Instant Confirmations**: Near-instant transaction confirmations
- ✅ **Security**: Built-in sensitive data protection

## Supported Networks

- **Mainnet**: Kaspa Mainnet (KAS)
- **Testnet-10**: Kaspa Testnet (development)
- **Testnet-11**: Kaspa Testnet (integration)
- **Simnet**: Kaspa Simulation Network (testing)

## Installation

```bash
# Usually installed as part of the main SDK
npm install @delandlabs/hibit-id-sdk

# For direct usage (advanced)
npm install @delandlabs/coin-kaspa
```

## Usage

### Basic Wallet Operations

```typescript
import { KaspaChainWallet } from '@delandlabs/coin-kaspa';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';

// Initialize wallet
const wallet = new KaspaChainWallet(chainInfo, mnemonic, {
  logger: console // optional
});

// Get account information
const account = await wallet.getAccount();
console.log('Address:', account.address);
console.log('Public Key:', account.publicKey);

// Check KAS balance
const balance = await wallet.balanceOf({
  address: account.address,
  token: { assetType: ChainAssetType.Native }
});

// Transfer KAS
const txHash = await wallet.transfer({
  recipientAddress: 'kaspa:qqkqkzjvvfd...',
  amount: '10',
  token: { assetType: ChainAssetType.Native }
});
```

### KRC-20 Token Operations

```typescript
// Check KRC-20 token balance
const tokenBalance = await wallet.balanceOf({
  address: account.address,
  token: {
    assetType: ChainAssetType.KRC20,
    contractAddress: 'kaspa:qr...', // Token contract
    decimals: 8
  }
});

// Transfer KRC-20 tokens
const txHash = await wallet.transfer({
  recipientAddress: 'kaspa:qqkqkzjvvfd...',
  amount: '1000',
  token: {
    assetType: ChainAssetType.KRC20,
    contractAddress: 'kaspa:qr...',
    decimals: 8
  }
});

// Estimate transaction fee
const fee = await wallet.estimateFee({
  recipientAddress: 'kaspa:qqkqkzjvvfd...',
  amount: '1000',
  token: { assetType: ChainAssetType.KRC20, contractAddress: 'kaspa:qr...' }
});
```

### Message Signing

```typescript
// Sign a message using Kaspa's signing method
const signature = await wallet.signMessage({
  message: 'Hello Kaspa!'
});
```

### Transaction Confirmation

```typescript
// Wait for transaction confirmation (usually instant on Kaspa)
const result = await wallet.waitForConfirmation({
  txHash: '...',
  requiredConfirmations: 1,
  timeoutMs: 30000, // 30 seconds, usually much faster
  onConfirmationUpdate: (current, required) => {
    console.log(`Confirmations: ${current}/${required}`);
  }
});

if (result.isConfirmed) {
  console.log('Transaction confirmed!');
  console.log('Block hash:', result.blockNumber);
  console.log('Transaction fee:', result.transactionFee?.toString(), 'KAS');
}
```

## Architecture

### Kaspa-Specific Features

#### BlockDAG Architecture

Kaspa uses a unique blockDAG (Directed Acyclic Graph) instead of traditional blockchain:

- **Parallel Blocks**: Multiple blocks can be mined simultaneously
- **High Throughput**: ~1 block per second with instant confirmations
- **GHOSTDAG Protocol**: Consensus mechanism for ordering transactions

#### UTXO Model

Kaspa uses Bitcoin-like UTXO (Unspent Transaction Output) model:

- **UTXO Selection**: Automatic optimal UTXO selection
- **Change Management**: Automatic change output handling
- **Dust Prevention**: Prevents creation of dust UTXOs

### Strategy Pattern

- **KasNativeHandler**: Handles KAS native token operations
- **Krc20TokenHandler**: Handles KRC-20 token operations

### Connection Management

- **RPC Connection**: Direct connection to Kaspa daemon
- **WebSocket Support**: Real-time updates for transaction status
- **Node Failover**: Automatic failover to backup nodes

## Configuration

### Chain Configuration

```typescript
import { ChainInfo, ChainId, ChainNetwork } from '@delandlabs/hibit-basic-types';

const kaspaMainnet: ChainInfo = {
  chainId: new ChainId(ChainType.Kaspa, ChainNetwork.KaspaMainNet),
  rpc: {
    primary: 'https://api.kaspa.org',
    fallback: ['https://kaspa-rpc.publicnode.com', 'https://kaspa.drpc.org']
  }
};
```

### UTXO Configuration

```typescript
// The wallet automatically manages UTXOs, but you can configure behavior
const wallet = new KaspaChainWallet(chainInfo, mnemonic, {
  // UTXO selection strategies can be configured here
  logger: console
});
```

## Error Handling

```typescript
import {
  NetworkError,
  InsufficientBalanceError,
  KaspaError
} from '@delandlabs/coin-base';

try {
  await wallet.transfer({...});
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.error('Insufficient KAS balance or UTXOs');
  } else if (error instanceof NetworkError) {
    console.error('Kaspa network error:', error.message);
  }
}
```

## Popular KRC-20 Tokens

```typescript
// NACHO (Example KRC-20 token)
const NACHO = {
  assetType: ChainAssetType.KRC20,
  contractAddress: 'kaspa:qr...', // Contract address
  decimals: 8
};

// Note: KRC-20 ecosystem is still developing
// Check kaspa.org for latest token listings
```

## Fee Structure

### KAS Transfers

- **Base fee**: ~0.001 KAS (dynamic based on network)
- **Priority fee**: Optional priority fees for faster processing
- **UTXO consolidation**: May require additional fees for many small UTXOs

### KRC-20 Transfers

- **Base fee**: ~0.002 KAS (includes contract interaction)
- **Token data**: Additional fee for token transfer data
- **Contract execution**: Fees for smart contract operations

### Fee Optimization

The wallet automatically optimizes fees:

1. Selects optimal UTXOs to minimize fees
2. Consolidates UTXOs when beneficial
3. Estimates fees based on current network conditions

## UTXO Management

### Automatic UTXO Selection

```typescript
// The wallet automatically selects the best UTXOs for transactions
const result = await wallet.transfer({
  recipientAddress: 'kaspa:qqkqkzjvvfd...',
  amount: '10',
  token: { assetType: ChainAssetType.Native }
});

// UTXO selection considers:
// - Minimizing transaction size
// - Avoiding dust creation
// - Optimizing for future transactions
```

### UTXO Consolidation

```typescript
// Consolidate small UTXOs for better efficiency (if needed)
// This is typically handled automatically by the wallet
const consolidationTx = await wallet.consolidateUtxos();
```

## Address Formats

Kaspa uses multiple address formats:

- **Bech32**: `kaspa:qqkqkzjvvfd...` (recommended)
- **Legacy**: `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` (Bitcoin-style)

The wallet automatically handles format conversions and validation.

```typescript
// Check if address is valid
const isValid = wallet.isValidAddress('kaspa:qqkqkzjvvfd...');
console.log('Valid Kaspa address:', isValid);
```

## Development

### Building

```bash
pnpm build:coin-kaspa
```

### Testing

```bash
pnpm test:coin-kaspa
```

### Security Linting

```bash
pnpm lint packages/coin-kaspa/src/**/*.ts
```

## Dependencies

- **kaspa-wasm**: Official Kaspa WebAssembly library
- **@delandlabs/coin-base**: Base wallet functionality
- **@delandlabs/crypto-lib**: ECDSA key derivation
- **secp256k1**: Elliptic curve cryptography

## Network Differences

### Mainnet

- **Network ID**: kaspa-mainnet
- **RPC**: https://api.kaspa.org
- **Explorer**: https://explorer.kaspa.org

### Testnet-10

- **Network ID**: kaspa-testnet-10
- **RPC**: https://api-testnet-10.kaspa.org
- **Explorer**: https://explorer-testnet-10.kaspa.org
- **Faucet**: Available for testing

### Testnet-11

- **Network ID**: kaspa-testnet-11
- **RPC**: https://api-testnet-11.kaspa.org
- **Explorer**: https://explorer-testnet-11.kaspa.org

## Performance Optimizations

1. **UTXO Caching**: Cache UTXO sets for faster selection
2. **Parallel Processing**: Leverage Kaspa's parallel block processing
3. **Connection Pooling**: Reuse RPC connections
4. **Batch Operations**: Group multiple operations when possible

## Kaspa vs Bitcoin Differences

| Feature       | Bitcoin        | Kaspa                 |
| ------------- | -------------- | --------------------- |
| Block Time    | ~10 minutes    | ~1 second             |
| Confirmations | 6+ recommended | 1 usually sufficient  |
| Architecture  | Blockchain     | BlockDAG              |
| Throughput    | ~7 TPS         | ~1000+ TPS            |
| Energy Usage  | High (PoW)     | Lower (optimized PoW) |

## Contributing

When contributing to this package:

1. Test on testnet before mainnet
2. Consider Kaspa's unique UTXO and blockDAG features
3. Add comprehensive tests for KRC-20 operations
4. Use `@cleanSensitiveData` for sensitive methods
5. Follow Kaspa address validation patterns

## License

MIT License - see LICENSE file for details.
