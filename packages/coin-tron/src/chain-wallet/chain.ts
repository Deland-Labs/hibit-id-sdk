import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from '@delandlabs/coin-base/model';

export const Tron: ChainInfo = {
  chainId: new ChainId(Chain.Tron, ChainNetwork.TronMainNet),
  name: 'Tron',
  fullName: 'Tron Mainnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  nativeAssetDecimals: 6,
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Tron,
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  explorer: 'https://tronscan.org',
  rpcUrls: ['https://api.trongrid.io'],
  caseSensitiveAddress: true,
  getTxLink: (txId: string) => {
    if (!txId?.trim()) return '';

    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://tronscan.org/#/transaction/${hash}`;
  },
  getAddressLink: (address: string) => {
    if (!address?.trim()) return '';

    return `https://tronscan.org/#/address/${address}`;
  }
};
export const TronShasta: ChainInfo = {
  chainId: new ChainId(Chain.Tron, ChainNetwork.TronShastaTestNet),
  name: 'TronShasta',
  fullName: 'Tron Shasta Testnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  nativeAssetDecimals: 6,
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Tron,
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  explorer: 'https://shasta.tronscan.org',
  rpcUrls: ['https://api.shasta.trongrid.io'],
  caseSensitiveAddress: true,
  getTxLink: (txId: string) => {
    if (!txId?.trim()) return '';

    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://shasta.tronscan.org/#/transaction/${hash}`;
  },
  getAddressLink: (address: string) => {
    if (!address?.trim()) return '';

    return `https://shasta.tronscan.org/#/address/${address}`;
  }
};
export const TronNile: ChainInfo = {
  chainId: new ChainId(Chain.Tron, ChainNetwork.TronNileTestNet),
  name: 'TronNile',
  fullName: 'Tron Nile Testnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  nativeAssetDecimals: 6,
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Tron,
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  explorer: 'https://nile.tronscan.org',
  rpcUrls: ['https://api.nileex.io'],
  caseSensitiveAddress: true,
  getTxLink: (txId: string) => {
    if (!txId?.trim()) return '';

    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://nile.tronscan.org/#/transaction/${hash}`;
  },
  getAddressLink: (address: string) => {
    if (!address?.trim()) return '';

    return `https://nile.tronscan.org/#/address/${address}`;
  }
};
