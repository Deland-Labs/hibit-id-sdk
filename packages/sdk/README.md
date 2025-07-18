# @delandlabs/hibit-id-sdk

The main SDK package for integrating Hibit ID wallet into your DApp. For project overview and complete documentation, see the [main README](../../README.md).

## Installation

```bash
npm install @delandlabs/hibit-id-sdk
# Don't forget to import the required styles in your app
```

## Usage

```javascript
import { HibitIdWallet, HibitIdChainId, HibitIdAssetType } from '@delandlabs/hibit-id-sdk';
import '@delandlabs/hibit-id-sdk/dist/style.css'; // Required for wallet UI

// Initialize
const wallet = new HibitIdWallet({
  env: 'prod',  // 'prod' | 'test'
  chains: [HibitIdChainId.Ethereum, HibitIdChainId.BSC],
  defaultChain: HibitIdChainId.Ethereum
});

// Connect
const account = await wallet.connect(HibitIdChainId.Ethereum);

// Basic operations
const signature = await wallet.signMessage('Hello Web3!');
const balance = await wallet.getBalance({ assetType: HibitIdAssetType.Native });
const txId = await wallet.transfer({ toAddress: '0x...', amount: '0.1' });
```

## API Reference

### Initialization Options

```typescript
interface HibitIdWalletOptions {
  env: 'prod' | 'test';           // Network environment
  chains: HibitIdChainId[];       // Supported chains
  defaultChain: HibitIdChainId;   // Initial chain
  embedMode?: 'floating' | 'background';  // UI mode
}
```

### Core Methods

- `connect(chainId: HibitIdChainId): Promise<WalletAccount>`
- `disconnect(): Promise<void>`
- `signMessage(message: string): Promise<string>`
- `getBalance(params: BalanceParams): Promise<string>`
- `transfer(params: TransferParams): Promise<string>`
- `switchToChain(chainId: HibitIdChainId): Promise<void>`
- `addEventListener(event: string, handler: Function): void`
- `removeEventListener(event: string, handler: Function): void`

### Events

- `chainChanged` - Fired when the active chain changes
- `accountsChanged` - Fired when the connected account changes

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  WalletAccount,
  TransferParams,
  BalanceParams,
  HibitIdError,
  HibitIdChainId,
  HibitIdAssetType
} from '@delandlabs/hibit-id-sdk';
```

## Special Integrations

### TON Connect

For TON blockchain integration with TonConnect protocol, see our [examples repository](https://github.com/Deland-Labs/hibit-id-examples).

## Error Handling

```javascript
try {
  const account = await wallet.connect(HibitIdChainId.Ethereum);
} catch (error) {
  if (error.code === HibitIdErrorCode.UserRejected) {
    console.log('User rejected the connection');
  } else {
    console.error('Connection error:', error.message);
  }
}
```

## Key Exports

```typescript
// Main class
export class HibitIdWallet { ... }

// Enums
export enum HibitIdChainId { ... }
export enum HibitIdAssetType { ... }
export enum HibitIdErrorCode { ... }
export enum AuthenticatorType { ... }

// Types
export type WalletAccount = { ... }
export type TransferParams = { ... }
export type BalanceParams = { ... }
export type HibitIdError = { ... }

// Utilities
export function getSupportedAuthParties(): AuthParty[]
```

## Advanced Usage

### Custom Transaction Parameters

```javascript
// With gas settings (EVM chains)
const txId = await wallet.transfer({
  toAddress: '0x...',
  amount: '0.1',
  assetType: HibitIdAssetType.Native,
  gasPrice: '20000000000', // wei
  gasLimit: '21000'
});

// Token transfers with approval
const tokenTxId = await wallet.transfer({
  toAddress: '0x...',
  amount: '100',
  assetType: HibitIdAssetType.ERC20,
  contractAddress: '0x...',
  decimalPlaces: 18
});
```

### Error Handling

```javascript
import { HibitIdErrorCode } from '@delandlabs/hibit-id-sdk';

try {
  await wallet.connect(HibitIdChainId.Ethereum);
} catch (error) {
  switch (error.code) {
    case HibitIdErrorCode.UserRejected:
      console.log('User cancelled connection');
      break;
    case HibitIdErrorCode.ChainNotSupported:
      console.log('Chain not supported');
      break;
    default:
      console.error('Unknown error:', error);
  }
}
```

### Chain-Specific Features

For chain-specific implementations and features, this SDK uses the following internal packages:
- `@delandlabs/coin-ethereum` - EVM chains support
- `@delandlabs/coin-solana` - Solana integration
- `@delandlabs/coin-ton` - TON blockchain support
- `@delandlabs/coin-tron` - Tron network
- `@delandlabs/coin-kaspa` - Kaspa blockchain
- `@delandlabs/coin-dfinity` - ICP/Internet Computer
- `@delandlabs/coin-bitcoin` - Bitcoin support

## Development

### Building from Source

```bash
# From monorepo root
yarn build:sdk

# Watch mode
yarn dev
```

### Testing

```bash
# Run SDK tests
yarn test:sdk
```

## Links

- [Main Documentation](../../README.md)
- [Examples](https://github.com/Deland-Labs/hibit-id-examples)
- [NPM Package](https://www.npmjs.com/package/@delandlabs/hibit-id-sdk)
