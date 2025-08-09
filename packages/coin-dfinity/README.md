# @delandlabs/coin-dfinity

Internet Computer (ICP) blockchain integration for Hibit ID SDK, supporting ICP and ICRC tokens.

## Features

- ✅ **Native ICP Support**: Internet Computer native token operations
- ✅ **ICRC Token Support**: Full ICRC-1, ICRC-3, ICRC-7 standard support
- ✅ **Canister Interactions**: Direct smart contract (canister) calls
- ✅ **Multi-Environment**: Production, staging, and local replica support
- ✅ **Instant Finality**: Sub-second transaction finality
- ✅ **Security**: Built-in sensitive data protection

## Supported Standards

- **ICRC-1**: Fungible token standard
- **ICRC-3**: Block and transaction logs
- **ICRC-7**: Non-fungible token (NFT) standard
- **ICRC-25**: Signer interaction standard
- **ICRC-27**: Identity verification
- **ICRC-32**: Sign challenge
- **ICRC-49**: Call canister

## Supported Networks

- **Mainnet**: Internet Computer Mainnet
- **Local Replica**: Local development environment
- **Testnet**: Various test networks

## Installation

```bash
# Usually installed as part of the main SDK
npm install @delandlabs/hibit-id-sdk

# For direct usage (advanced)
npm install @delandlabs/coin-dfinity
```

## Usage

### Basic Wallet Operations

```typescript
import { IcpChainWallet } from '@delandlabs/coin-dfinity';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';

// Initialize wallet
const wallet = new IcpChainWallet(chainInfo, mnemonic, {
  logger: console // optional
});

// Get account information
const account = await wallet.getAccount();
console.log('Principal:', account.address);
console.log('Account ID:', account.accountId);

// Check ICP balance
const balance = await wallet.balanceOf({
  address: account.address,
  token: { assetType: ChainAssetType.Native }
});

// Transfer ICP
const txHash = await wallet.transfer({
  recipientAddress: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
  amount: '1.5',
  token: { assetType: ChainAssetType.Native }
});
```

### ICRC Token Operations

```typescript
// Check ICRC token balance
const tokenBalance = await wallet.balanceOf({
  address: account.address,
  token: {
    assetType: ChainAssetType.ICRC,
    contractAddress: 'mxzaz-hqaaa-aaaar-qaada-cai', // ckBTC
    decimals: 8
  }
});

// Transfer ICRC tokens
const txHash = await wallet.transfer({
  recipientAddress: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
  amount: '0.001',
  token: {
    assetType: ChainAssetType.ICRC,
    contractAddress: 'mxzaz-hqaaa-aaaar-qaada-cai', // ckBTC
    decimals: 8
  }
});

// Estimate transaction fee
const fee = await wallet.estimateFee({
  recipientAddress: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
  amount: '0.001',
  token: { assetType: ChainAssetType.ICRC, contractAddress: 'mxzaz-hqaaa-aaaar-qaada-cai' }
});
```

### Message Signing

```typescript
// Sign a message (ICRC-25 compatible)
const signature = await wallet.signMessage({
  message: 'Hello Internet Computer!'
});
```

### Canister Interactions

```typescript
// Direct canister calls (advanced usage)
import { Principal } from '@dfinity/principal';

// The wallet provides low-level canister interaction capabilities
// Most users should use the high-level transfer/balance methods above
```

### Transaction Confirmation

```typescript
// Wait for transaction confirmation (usually instant on ICP)
const result = await wallet.waitForConfirmation({
  txHash: '...',
  requiredConfirmations: 1, // ICP has instant finality
  timeoutMs: 30000,
  onConfirmationUpdate: (current, required) => {
    console.log(`Confirmations: ${current}/${required}`);
  }
});

if (result.isConfirmed) {
  console.log('Transaction confirmed!');
  console.log('Block height:', result.blockNumber);
  console.log('Transaction fee:', result.transactionFee?.toString(), 'ICP');
}
```

## Architecture

### Internet Computer Specific Features

#### Principal vs Account Identifier

- **Principal**: Primary identity format (`rdmx6-jaaaa-aaaah-qcaiq-cai`)
- **Account Identifier**: Legacy format for ledger interactions
- **SubAccount**: Optional 32-byte identifier for multiple accounts per principal

#### Instant Finality

- **Consensus**: Internet Computer provides instant transaction finality
- **No Confirmations**: Transactions are final immediately after execution
- **State Replication**: Automatic state replication across subnet nodes

### Strategy Pattern

- **IcpNativeHandler**: Handles ICP native token operations
- **IcrcTokenHandler**: Handles ICRC token operations

### Connection Management

- **Agent**: HttpAgent for canister communication
- **Identity**: Secp256k1Identity for transaction signing
- **Replica**: Automatic connection to IC replica network

## Configuration

### Chain Configuration

```typescript
import { ChainInfo, ChainId, ChainNetwork } from '@delandlabs/hibit-basic-types';

const icpMainnet: ChainInfo = {
  chainId: new ChainId(ChainType.Dfinity, ChainNetwork.DfinityMainNet),
  rpc: {
    primary: 'https://ic0.app',
    fallback: ['https://icp0.io', 'https://icp-api.io']
  }
};
```

### Local Development

```typescript
// For local replica development
const icpLocal: ChainInfo = {
  chainId: new ChainId(ChainType.Dfinity, ChainNetwork.DfinityLocal),
  rpc: {
    primary: 'http://localhost:4943', // Default local replica port
    fallback: []
  }
};
```

## Error Handling

```typescript
import {
  NetworkError,
  InsufficientBalanceError,
  IcpError
} from '@delandlabs/coin-base';

try {
  await wallet.transfer({...});
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.error('Insufficient ICP balance');
  } else if (error instanceof NetworkError) {
    console.error('Internet Computer network error:', error.message);
  }
}
```

## Popular ICRC Tokens

```typescript
// ckBTC (Chain-key Bitcoin)
const ckBTC = {
  assetType: ChainAssetType.ICRC,
  contractAddress: 'mxzaz-hqaaa-aaaar-qaada-cai',
  decimals: 8
};

// ckETH (Chain-key Ethereum)
const ckETH = {
  assetType: ChainAssetType.ICRC,
  contractAddress: 'ss2fx-dyaaa-aaaar-qacoq-cai',
  decimals: 18
};

// ckUSDC (Chain-key USDC)
const ckUSDC = {
  assetType: ChainAssetType.ICRC,
  contractAddress: 'xkbca-2qaaa-aaaah-qbpqq-cai',
  decimals: 6
};

// CHAT (OpenChat Token)
const CHAT = {
  assetType: ChainAssetType.ICRC,
  contractAddress: '2ouva-viaaa-aaaaq-aaamq-cai',
  decimals: 8
};
```

## Fee Structure

### ICP Transfers

- **Base fee**: 0.0001 ICP (10,000 e8s)
- **Transaction fee**: Fixed fee structure
- **No gas model**: Simple, predictable fees

### ICRC Token Transfers

- **Transfer fee**: Varies by token (typically 0.0001-0.001 ICP equivalent)
- **Canister cycles**: Computational cost paid in cycles
- **Storage fees**: Minimal storage costs

## Address Formats

### Principal Format

Internet Computer uses Principal identifiers:

- **Format**: `rdmx6-jaaaa-aaaah-qcaiq-cai`
- **Base32**: Modified base32 encoding with checksum
- **Length**: Variable length (typically 27-63 characters)

### Account Identifier (Legacy)

- **Format**: `a4ac33467a6e6cf2168ff5ea09b9f47e91f8e77ab4a6c77a2af91ab5b8b74b1b`
- **Hex**: 64-character hexadecimal string
- **Usage**: Legacy ledger canister compatibility

```typescript
// The wallet automatically handles both formats
const isValidPrincipal = wallet.isValidAddress('rdmx6-jaaaa-aaaah-qcaiq-cai');
const isValidAccountId = wallet.isValidAddress('a4ac33467a6e6cf2168ff5ea09b9f47e91f8e77ab4a6c77a2af91ab5b8b74b1b');
```

## Development

### Building

```bash
pnpm build:coin-dfinity
```

### Testing

```bash
pnpm test:coin-dfinity
```

### Security Linting

```bash
pnpm lint packages/coin-dfinity/src/**/*.ts
```

## Dependencies

- **@dfinity/agent**: Internet Computer agent library
- **@dfinity/candid**: Candid interface description language
- **@dfinity/principal**: Principal identifier utilities
- **@dfinity/identity**: Identity management
- **@delandlabs/coin-base**: Base wallet functionality
- **@delandlabs/crypto-lib**: Ed25519 key derivation

## Canister Development

### Working with Custom Canisters

```typescript
// The wallet provides the underlying identity and agent
// for custom canister interactions
const identity = wallet.getIdentity(); // Internal method
const agent = wallet.getAgent(); // Internal method

// Use these with @dfinity libraries for custom canister calls
import { Actor } from '@dfinity/agent';

const customCanister = Actor.createActor(idlFactory, {
  agent,
  canisterId: 'your-canister-id'
});
```

## Performance Optimizations

1. **Connection Caching**: Reuse HttpAgent connections
2. **Identity Caching**: Cache identity derivation
3. **Replica Selection**: Automatic optimal replica selection

## Internet Computer vs Traditional Blockchains

| Feature         | Traditional Blockchain | Internet Computer           |
| --------------- | ---------------------- | --------------------------- |
| Finality        | ~1-60 minutes          | Instant (~2 seconds)        |
| Smart Contracts | Limited execution      | Full Web3 capabilities      |
| Storage         | Expensive              | Built-in persistent storage |
| Upgrades        | Immutable              | Upgradeable canisters       |
| Fees            | Gas-based              | Cycles-based                |

## Contributing

When contributing to this package:

1. Test with local replica for development
2. Understand IC's unique features (instant finality, canisters)
3. Add comprehensive tests for ICRC token operations
4. Use `@cleanSensitiveData` for sensitive methods
5. Consider both Principal and Account ID formats

## Resources

- **Internet Computer Documentation**: https://internetcomputer.org/docs
- **ICRC Standards**: https://github.com/dfinity/ICRC-1
- **Candid Documentation**: https://internetcomputer.org/docs/current/developer-docs/build/candid/
- **IC SDK**: https://internetcomputer.org/docs/current/developer-docs/setup/install/

## License

MIT License - see LICENSE file for details.
