# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build Commands
```bash
# Build all packages
yarn build:all

# Build specific packages
yarn build:sdk           # Main SDK
yarn build:coin-base     # Base functionality
yarn build:coin-ethereum # Ethereum integration
yarn build:coin-ton      # TON integration
yarn build:coin-solana   # Solana integration
yarn build:coin-tron     # Tron integration
yarn build:coin-dfinity  # ICP integration
yarn build:coin-kaspa    # Kaspa integration
```

### Development
```bash
# Run SDK in development mode with hot reload
yarn dev:sdk
```

### Testing
```bash
# Run all tests
yarn test:all

# Test specific package
yarn test:coin-kaspa
```

## Architecture Overview

This is a monorepo for Hibit ID, a non-custodial multi-chain wallet SDK. The architecture follows a modular design where each blockchain has its own package while sharing common functionality.

### Package Structure
- **packages/crypto-lib**: Core cryptographic operations used across all chains
- **packages/coin-base**: Base classes and interfaces that all blockchain integrations extend
- **packages/coin-[blockchain]**: Individual blockchain integrations (ethereum, ton, solana, etc.)
- **packages/sdk**: Main SDK that aggregates all blockchain integrations for developers

### Build Dependencies
The build system uses Turborepo with a specific dependency chain:
1. `crypto-lib` builds first (both ESM and CommonJS formats)
2. `coin-base` depends on `crypto-lib`
3. All blockchain packages depend on `coin-base`
4. The main SDK depends on `coin-base` and specific blockchain packages

### Key Architectural Patterns

1. **Wallet Interface**: Each blockchain package implements a consistent wallet interface defined in `coin-base`, ensuring uniform API across chains.

2. **Chain Configuration**: Each blockchain package exports chain configurations in `src/chains.ts` that define network parameters, RPC endpoints, and chain-specific settings.

3. **Cryptographic Operations**: All cryptographic operations are centralized in `crypto-lib` to ensure security and consistency.

4. **Build System**: Uses Vite for building with TypeScript support. Each package generates both ESM and UMD builds for maximum compatibility.

5. **Testing Strategy**: Each package has its own test suite in the `tests/` directory using Vitest.

### Development Workflow

1. **Making Changes**: When modifying blockchain integrations, ensure changes follow the existing patterns in other blockchain packages.

2. **Adding New Chains**: Create a new package under `packages/coin-[blockchain]/` following the structure of existing packages. Update `turbo.json` to include build dependencies.

3. **Testing**: Always run tests for the specific package you're modifying before running the full test suite.

4. **Building**: The build system respects dependencies, so building a higher-level package will automatically build its dependencies.

### Important Notes

- The project uses Yarn v1.22.22 with workspaces. Do not use npm or other package managers.
- Environment variables prefixed with `VITE_` are available during build time.
- The SDK includes a development UI built with React and Tailwind CSS for testing wallet functionality.
- Pre-commit hooks are configured with Husky and lint-staged for code quality.