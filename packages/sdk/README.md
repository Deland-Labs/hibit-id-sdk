# Introduction

HiBit ID is a web-based multi-chain crypto wallet, with SDK for DApp integration.

It supports a variety of popular third-party login methods which links user's Web2 accounts seamlessly to the Web3 world.

# Supported Third-party Login Methods

- [x] Telegram
- [ ] Google
- [ ] Facebook
- [ ] X
- [ ] Apple
- [ ] Github
- and more...

# Supported Chains

- [x] Ethereum
- [x] BNB Smart Chain
- [x] Base
- [x] Avalanche
- [x] Scroll
- [x] Bitlayer
- [x] Ton
- [ ] Solana
- [ ] Bitcoin
- [ ] Tron
- and more...

# Integration

## Install SDK

```bash
yarn add hibit-id-sdk
```

## Usage

```js
import {
  HibitIdWallet,
  HibitIdChainId,
  WalletAccount,
  HibitIdAssetType,
} from "hibit-id-sdk"
// remember to import styles for the wallet
import 'hibit-id-sdk/dist/style.css';

// init hibitid wallet
const hibitId = new HibitIdWallet({
  env: 'prod',  // 'prod' or 'test'
  chains: [
    HibitIdChainId.Ethereum,
    HibitIdChainId.Ton,
  ],
  defaultChain: HibitIdChainId.Ethereum,
})

// connect
const walletAccount: WalletAccount = await hibitId.connect(HibitIdChainId.Ethereum)

// sign
const signature: string = await hibitId.signMessage(msg)

// get balance
const balance: string = await hibitId.getBalance({
  assetType: HibitIdAssetType.ERC20,
  chainId: HibitIdChainId.Ethereum,
  contractAddress: '0x......',  // required for non-native tokens
  decimalPlaces: 18,
})

// transfer
const txId: string = await hibitId.transfer({
  toAddress: '0x......',
  amount: '0.1',
  assetType: HibitIdAssetType.ERC20,
  contractAddress: '0x......',  // required for non-native tokens
  decimalPlaces: 18,
})

// switch chain
await hibitId.switchToChain(HibitIdChainId.TonMainnet)

// listen to events
hibitId.addEventListener('chainChanged', (chainId: HibitIdChainId) => {
  console.log(chainId)
});
hibitId.addEventListener('accountsChanged', (account: WalletAccount | null) => {
  console.log(account)
});

// remove event listeners
hibitId.removeEventListener('chainChanged', chainChangedHandler);
hibitId.removeEventListener('accountsChanged', accountsChangedHandler);
```

## TonConnect integration

Please refer to [hibit-id-examples](https://github.com/Deland-Labs/hibit-id-examples) for TonConnect integration.
