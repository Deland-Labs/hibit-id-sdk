# Hibit ID SDK

[![npm version](https://img.shields.io/npm/v/@delandlabs/hibit-id-sdk)](https://www.npmjs.com/package/@delandlabs/hibit-id-sdk)
[![Build Status](https://github.com/deland-labs/hibit-id-sdk/actions/workflows/build.yml/badge.svg)](https://github.com/deland-labs/hibit-id-sdk/actions)
[![Test Status](https://img.shields.io/github/actions/workflow/status/deland-labs/hibit-id-sdk/test.yml?label=tests)](https://github.com/deland-labs/hibit-id-sdk/actions)
[![License](https://img.shields.io/github/license/deland-labs/hibit-id-sdk)](LICENSE)

## Introduction

Hibit ID SDK is a non-custodial multi-chain wallet SDK that enables seamless Web3 integration for DApps. By bridging Web2 authentication methods with Web3 wallets, Hibit ID makes blockchain technology accessible to mainstream users while maintaining enterprise-grade security.

## Key Features

- 🔐 **Non-custodial**: Users maintain full control of their private keys
- 🌐 **Multi-chain Support**: Unified interface for 30+ blockchain networks
- 🔗 **Web2 Authentication**: Familiar login methods (Telegram, Google, X)
- 🛡️ **Enterprise Security**: Built with best practices for wallet security
- 🎨 **Customizable UI**: Flexible integration with your DApp's design
- 📱 **Cross-platform**: Works seamlessly across web applications

## Installation

```bash
# Using npm
npm install @delandlabs/hibit-id-sdk

# Using pnpm
pnpm add @delandlabs/hibit-id-sdk

# Using yarn
yarn add @delandlabs/hibit-id-sdk
```

## ⚠️ Important: Breaking Changes in v2.0

**The SDK now uses smallest unit values (wei, lamports, etc.) for all operations.** This ensures precision and follows low-level library best practices.

- **Balances**: Returned in smallest units (e.g., wei for ETH, lamports for SOL)
- **Transfers**: Amounts must be provided in smallest units
- **New Method**: `getAssetDecimals()` to query decimal places for display conversion

For migration details, see [INTERFACE_CHANGES.md](./INTERFACE_CHANGES.md).

## Quick Start

```javascript
import { HibitIdWallet, HibitIdChainId, HibitIdAssetType } from '@delandlabs/hibit-id-sdk';
// Import required styles
import '@delandlabs/hibit-id-sdk/dist/style.css';

// Initialize wallet
const wallet = new HibitIdWallet({
  env: 'prod', // or 'test' for testnet
  chains: [HibitIdChainId.Ethereum, HibitIdChainId.BSC, HibitIdChainId.Solana],
  defaultChain: HibitIdChainId.Ethereum
});

// Connect wallet
const account = await wallet.connect(HibitIdChainId.Ethereum);
console.log('Connected:', account.address);

// Sign message
const signature = await wallet.signMessage('Hello Web3!');

// Get balance (returns smallest unit - wei for ETH)
const balance = await wallet.getBalance({
  assetType: HibitIdAssetType.Native,
  chainId: HibitIdChainId.Ethereum
});
console.log('Balance in wei:', balance); // e.g., '1500000000000000000' for 1.5 ETH

// Get decimals for display conversion
const decimals = await wallet.getAssetDecimals({
  assetType: HibitIdAssetType.Native,
  chainId: HibitIdChainId.Ethereum
});
const humanReadableBalance = balance.dividedBy(10 ** decimals);
console.log('Balance in ETH:', humanReadableBalance.toString()); // '1.5'

// Transfer tokens (amount in smallest unit - wei for ETH)
const amountInWei = new BigNumber('0.1').multipliedBy(10 ** decimals); // Convert 0.1 ETH to wei
const txId = await wallet.transfer({
  toAddress: '0x...',
  amount: amountInWei, // Amount in wei
  assetType: HibitIdAssetType.Native
});
```

## Examples

For complete integration examples with various frameworks and use cases, check out our [examples repository](https://github.com/Deland-Labs/hibit-id-examples).

## Supported Blockchains

### EVM Compatible Chains

- **Ethereum** (Mainnet, Sepolia Testnet)
- **BNB Smart Chain** (Mainnet, Testnet)
- **Base** (Mainnet, Sepolia Testnet)
- **Avalanche** (Mainnet, Fuji Testnet)
- **Scroll** (Mainnet, Sepolia Testnet)
- **Bitlayer** (Mainnet, Testnet)
- **Panta** (Mainnet)
- **Neo X** (Mainnet, Testnet)
- **Kasplex L2** (Testnet)

### Non-EVM Chains

- **Bitcoin** (Mainnet, Testnet)
- **Solana** (Mainnet, Testnet)
- **TON** (Mainnet, Testnet)
- **Tron** (Mainnet, Shasta, Nile Testnet)
- **Kaspa** (Mainnet, Testnet)
- **ICP (Internet Computer)** (Mainnet)

## Supported Authentication Methods

- ✅ **Telegram** - Full support with Telegram Mini Apps
- ✅ **Google** - OAuth integration
- ✅ **X (Twitter)** - OAuth integration
- 🔜 Facebook, Apple, GitHub (Coming soon)

## Supported Asset Types

| Chain        | Native | Tokens        | NFTs |
| ------------ | ------ | ------------- | ---- |
| Ethereum/EVM | ✅     | ERC20, ERC721 | ✅   |
| Solana       | ✅     | SPL           | ✅   |
| TON          | ✅     | Jetton        | -    |
| Tron         | ✅     | TRC20         | -    |
| Kaspa        | ✅     | KRC20         | -    |
| ICP          | ✅     | ICRC1, DFT    | -    |
| Bitcoin      | ✅     | BRC20         | -    |

## Advanced Features

### Event Handling

```javascript
// Listen to chain changes
wallet.addEventListener('chainChanged', (chainId) => {
  console.log('Chain switched to:', chainId);
});

// Listen to account changes
wallet.addEventListener('accountsChanged', (account) => {
  console.log('Account changed:', account?.address);
});

// Remove listeners when done
wallet.removeEventListener('chainChanged', chainChangedHandler);
```

### Chain Switching

```javascript
// Switch to a different chain
await wallet.switchToChain(HibitIdChainId.BSC);
```

### Token Operations

```javascript
// ERC20 token balance
const tokenBalance = await wallet.getBalance({
  assetType: HibitIdAssetType.FT,
  chainId: HibitIdChainId.Ethereum,
  contractAddress: '0x...', // Token contract address
  decimalPlaces: 18
});

// Transfer ERC20 tokens
const txId = await wallet.transfer({
  toAddress: '0x...',
  amount: '100',
  assetType: HibitIdAssetType.FT,
  contractAddress: '0x...',
  decimalPlaces: 18
});
```

### TON Connect Integration

For TON blockchain integration, refer to our [examples repository](https://github.com/Deland-Labs/hibit-id-examples) for TonConnect-specific implementations.

## TypeScript Support

The SDK is written in TypeScript and provides comprehensive type definitions:

```typescript
import type { WalletAccount, TransferParams, HibitIdError } from '@delandlabs/hibit-id-sdk';

try {
  const account: WalletAccount = await wallet.connect(HibitIdChainId.Ethereum);
} catch (error: HibitIdError) {
  console.error('Connection failed:', error.code, error.message);
}
```

## Project Structure

This is a monorepo managed with Turbo, containing:

```
packages/
├── sdk/              # Main SDK package (@delandlabs/hibit-id-sdk)
├── crypto-lib/       # Core cryptographic utilities
├── coin-base/        # Base classes for blockchain integrations
├── coin-ethereum/    # Ethereum and EVM chains support
├── coin-solana/      # Solana blockchain support
├── coin-ton/         # TON blockchain support
├── coin-tron/        # Tron blockchain support
├── coin-kaspa/       # Kaspa blockchain support
├── coin-dfinity/     # Internet Computer (ICP) support
└── coin-bitcoin/     # Bitcoin support
```

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 9.15

### Setup

```bash
# Clone the repository
git clone https://github.com/deland-labs/hibit-id-sdk.git
cd hibit-id-sdk

# Install dependencies
pnpm install

# Build all packages
pnpm build:all
```

### Development Commands

```bash
# Build specific packages
pnpm build:sdk              # Main SDK package
pnpm build:coin-base         # Base functionality
pnpm build:coin-ethereum     # Ethereum integration
pnpm build:coin-ton          # TON integration
pnpm build:coin-solana       # Solana integration
pnpm build:coin-tron         # Tron integration
pnpm build:coin-dfinity      # ICP integration
pnpm build:coin-kaspa        # Kaspa integration
pnpm build:all               # All packages

# Run tests
pnpm test:all                # All tests with type checking
pnpm test:coin-kaspa         # Specific package tests
pnpm typecheck               # TypeScript type checking

# Code quality
pnpm lint                    # ESLint with custom security rules
pnpm lint:fix                # Auto-fix linting issues
pnpm format                  # Prettier formatting

# Development mode
pnpm dev:sdk                 # SDK development with hot reload

# Release management
pnpm release:dry             # Dry run release
pnpm release                 # Create release
```

### Project Architecture

This monorepo uses **Turbo** for build orchestration and **pnpm workspaces** for dependency management. Key architectural decisions:

#### 🏗️ **Build System**

- **Vite** for fast builds with TypeScript support
- **Turbo** for optimized task execution and caching
- **TypeScript** for type safety across all packages

#### 🔒 **Security Features**

- **Custom ESLint Rules**: Automatically detect sensitive data leaks
- **@cleanSensitiveData Decorator**: Prevents mnemonic/key exposure in logs
- **Sensitive Parameter Detection**: Build-time security validation

#### 📦 **Package Dependencies**

```
crypto-lib (base) ← coin-base ← coin-* packages ← sdk
```

#### 🛠️ **Configuration Architecture**

- **TypeScript Configs**: Type-safe for tools that support it (Vite, PostCSS, Tailwind)
- **JavaScript Configs**: Runtime compatibility for CLI tools (ESLint, Release-it)
- **ESM Modules**: Modern ES module format throughout

## Configuration

### Environment

```javascript
const wallet = new HibitIdWallet({
  env: 'prod' // 'prod' for mainnet, 'test' for testnets
  // ... other options
});
```

### Custom RPC Endpoints

You can configure custom RPC endpoints for specific chains through the wallet initialization options.

## Security Considerations

### 🛡️ **Runtime Security**

1. **Private Key Storage**: Private keys are stored encrypted and never exposed to the host application
2. **Iframe Isolation**: Wallet operates in an isolated iframe environment
3. **Message Validation**: All cross-frame messages are validated
4. **HTTPS Only**: The SDK requires HTTPS in production environments

### 🔒 **Development Security**

1. **Sensitive Data Protection**: Custom ESLint rules prevent mnemonic/private key leaks
2. **Automatic Cleanup**: `@cleanSensitiveData` decorator sanitizes error messages
3. **Build-time Validation**: Security checks during development and CI/CD
4. **No Mnemonic Storage**: Instance variables never store seed phrases

### 🧪 **Security Testing**

```bash
# Run security-focused linting
pnpm lint

# Check for sensitive data leaks
pnpm lint --rule local/sensitive-logging-protection

# The ESLint rule automatically detects patterns like:
# - Methods with mnemonic parameters
# - Missing @cleanSensitiveData decorators
# - Potential data leaks in error handling
```

## Browser Support

- Chrome/Chromium: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Edge: Latest 2 versions

## More Examples & Resources

- 📚 [Examples Repository](https://github.com/Deland-Labs/hibit-id-examples) - Complete integration examples
- 🎮 [Demo App](https://hibit-id-demo.delandlabs.com) - Live demonstration
- 📖 [API Documentation](https://docs.hibit.id) - Detailed API reference
- 💬 [Discord Community](https://discord.gg/hibitid) - Get help and connect

## Migration Guide

If you're migrating from the old package name:

```javascript
// Old import
import { HibitIdWallet } from 'hibit-id-sdk';

// New import
import { HibitIdWallet } from '@delandlabs/hibit-id-sdk';
```

## Troubleshooting

### Common Issues

1. **Styles not loading**: Make sure to import the CSS file
2. **Connection fails**: Check that you're using HTTPS in production
3. **Chain not supported**: Verify the chain ID in the supported list

For more help, check our [troubleshooting guide](https://docs.hibit.id/troubleshooting) or join our Discord.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Reporting Issues

Found a bug? Please [open an issue](https://github.com/deland-labs/hibit-id-sdk/issues) with:

- SDK version
- Browser and OS information
- Steps to reproduce
- Expected vs actual behavior

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by [DeLand Labs](https://delandlabs.com)
