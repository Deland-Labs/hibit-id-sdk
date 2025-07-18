# Hibit ID SDK

The main SDK package for integrating Hibit ID non-custodial wallet into your DApp.

## Installation

```bash
# Using npm (published as @delandlabs/hibit-id-sdk)
npm install @delandlabs/hibit-id-sdk

# Using yarn
yarn add @delandlabs/hibit-id-sdk
```

## Quick Start

```javascript
import { HibitIdWallet, HibitIdChainId, HibitIdAssetType } from '@delandlabs/hibit-id-sdk';
// Important: Import the required styles
import '@delandlabs/hibit-id-sdk/dist/style.css';

// Initialize the wallet
const wallet = new HibitIdWallet({
  env: 'prod',  // Use 'test' for testnet environments
  chains: [
    HibitIdChainId.Ethereum,
    HibitIdChainId.BSC,
    HibitIdChainId.Solana,
    HibitIdChainId.Ton
  ],
  defaultChain: HibitIdChainId.Ethereum
});

// Connect wallet
const account = await wallet.connect(HibitIdChainId.Ethereum);
console.log('Connected address:', account.address);

// Sign a message
const signature = await wallet.signMessage('Hello Hibit ID!');

// Get balance (native token)
const balance = await wallet.getBalance({
  assetType: HibitIdAssetType.Native,
  chainId: HibitIdChainId.Ethereum
});

// Get ERC20 token balance
const tokenBalance = await wallet.getBalance({
  assetType: HibitIdAssetType.ERC20,
  chainId: HibitIdChainId.Ethereum,
  contractAddress: '0x...',  // Token contract address
  decimalPlaces: 18
});

// Transfer native tokens
const txId = await wallet.transfer({
  toAddress: '0x...',
  amount: '0.1',
  assetType: HibitIdAssetType.Native
});

// Transfer ERC20 tokens
const tokenTxId = await wallet.transfer({
  toAddress: '0x...',
  amount: '100',
  assetType: HibitIdAssetType.ERC20,
  contractAddress: '0x...',
  decimalPlaces: 18
});

// Switch chains
await wallet.switchToChain(HibitIdChainId.BSC);

// Event listeners
wallet.addEventListener('chainChanged', (chainId) => {
  console.log('Chain changed:', chainId);
});

wallet.addEventListener('accountsChanged', (account) => {
  console.log('Account changed:', account?.address);
});
```

## Supported Features

### Authentication Methods
- ✅ **Telegram** - Full integration with Telegram Mini Apps
- ✅ **Google** - OAuth-based authentication
- ✅ **X (Twitter)** - OAuth-based authentication
- 🔜 Facebook, Apple, GitHub (Coming soon)

### Blockchain Networks

#### EVM Compatible
- Ethereum (Mainnet, Sepolia)
- BNB Smart Chain (Mainnet, Testnet)
- Base (Mainnet, Sepolia)
- Avalanche (Mainnet, Fuji)
- Scroll (Mainnet, Sepolia)
- Bitlayer (Mainnet, Testnet)
- Panta
- Neo X (Mainnet, Testnet)
- Kasplex L2 (Testnet)

#### Non-EVM
- Bitcoin (Mainnet, Testnet)
- Solana (Mainnet, Testnet)
- TON (Mainnet, Testnet)
- Tron (Mainnet, Shasta, Nile)
- Kaspa (Mainnet, Testnet)
- ICP/Dfinity (Mainnet)

### Asset Types

| Chain | Native | Tokens | NFTs |
|-------|--------|--------|------|
| EVM | ✅ | ERC20, ERC721 | ✅ |
| Solana | ✅ | SPL | ✅ |
| TON | ✅ | Jetton | - |
| Tron | ✅ | TRC20 | - |
| Kaspa | ✅ | KRC20 | - |
| ICP | ✅ | ICRC1, DFT | - |
| Bitcoin | ✅ | BRC20 | - |

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

## Important Notes

1. **Always import the CSS file** - The wallet UI requires the styles to function properly
2. **Use HTTPS in production** - The SDK requires secure contexts
3. **Handle errors gracefully** - All async methods can throw errors
4. **Remove event listeners** - Clean up listeners when components unmount

## Examples

For complete integration examples with various frameworks:
- [React Example](https://github.com/Deland-Labs/hibit-id-examples/tree/main/react)
- [Vue Example](https://github.com/Deland-Labs/hibit-id-examples/tree/main/vue)
- [Next.js Example](https://github.com/Deland-Labs/hibit-id-examples/tree/main/nextjs)
- [TonConnect Integration](https://github.com/Deland-Labs/hibit-id-examples/tree/main/tonconnect)

## Support

- [GitHub Issues](https://github.com/deland-labs/hibit-id-sdk/issues)
- [Discord Community](https://discord.gg/hibitid)
- [Documentation](https://docs.hibit.id)
