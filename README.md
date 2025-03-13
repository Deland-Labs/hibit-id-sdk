# Hibit ID SDKs

[![npm version](https://img.shields.io/npm/v/@delandlabs/hibit-id-sdk)](https://www.npmjs.com/package/@delandlabs/hibit-id-sdk)
[![Build Status](https://github.com/deland-labs/hibit-id-sdk/actions/workflows/build.yml/badge.svg)](https://github.com/deland-labs/hibit-id-sdk/actions)
[![Test Status](https://img.shields.io/github/actions/workflow/status/deland-labs/hibit-id-sdk/test.yml?label=tests)](https://github.com/deland-labs/hibit-id-sdk/actions)
[![License](https://img.shields.io/github/license/deland-labs/hibit-id-sdk)](LICENSE)
## Introduction

Hibit ID is a non-custodial multi-chain wallet solution developed by DeLand Labs. This monorepo contains the official SDK that enables seamless integration with various blockchain networks, allowing developers to incorporate Hibit ID into their DApps.

Hibit ID bridges Web2 and Web3 by supporting various third-party login methods, making blockchain technologies accessible to mainstream users while maintaining enterprise-grade security.

## Features

- **Multi-chain Support**: Connect to various blockchain networks through a unified interface
- **Non-custodial**: Users maintain full control of their private keys
- **Web2 Login Integration**: Connect existing Web2 accounts to Web3 wallets
- **Simple API**: Easy-to-use developer interfaces for DApp integration

## Supported Third-party Login Methods

- ✅ Telegram
- ✅ Google
- ✅ X
- 🔄 Facebook (coming soon)
- 🔄 Apple (coming soon)
- 🔄 Github (coming soon)


## Supported Chains

- ✅ Ethereum
- ✅ BNB Smart Chain
- ✅ Base
- ✅ Avalanche
- ✅ Scroll
- ✅ Bitlayer
- ✅ Swan
- ✅ Panta
- ✅ Neo X
- ✅ Bit Layer
- ✅ Ton
- ✅ Solana
- ✅ Tron
- ✅ ICP
- ✅ Kaspa

## Project Structure

```
packages/
  ├── coin-base/       # Base functionality for blockchain connectors
  ├── coin-dfinity/    # Internet Computer (ICP) integration
  ├── coin-ethereum/   # Ethereum and EVM chains integration
  ├── coin-kaspa/      # Kaspa blockchain integration
  ├── coin-solana/     # Solana blockchain integration
  ├── coin-ton/        # TON blockchain integration
  ├── coin-tron/       # Tron blockchain integration
  ├── crypto-lib/      # Core cryptographic functionality
  └── sdk/             # Main SDK for developer integration
```

## Installation

```bash
# Install the SDK
yarn add @delandlabs/hibit-id-sdk

# Or using npm
npm install @delandlabs/hibit-id-sdk
```
## Examples

Check out our [examples repository](https://github.com/Deland-Labs/hibit-id-examples) for complete integration examples with various frameworks and platforms.


## For Developers

### Building the Project
```bash
# Build all packages
yarn build:all

# Build specific package
yarn build:sdk
yarn build:coin-ethereum
```

### Running Tests
```bash
# Run all tests
yarn test:all

# Test specific package
yarn test:coin-kaspa
```

## Contributing

We welcome contributions from the community! Please feel free to submit issues and pull requests.