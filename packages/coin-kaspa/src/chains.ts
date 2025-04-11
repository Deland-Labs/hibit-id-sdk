import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from '@delandlabs/coin-base/model';

export const Kaspa: ChainInfo = {
  chainId: new ChainId(Chain.Kaspa, ChainNetwork.KaspaMainNet),
  name: 'Kaspa',
  fullName: 'Kaspa Mainnet',
  icon: '/chain-icons/Kaspa.svg',
  nativeAssetSymbol: 'KAS',
  nativeAssetDecimals: 8,
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Kaspa,
  supportedSignaturesSchemas: [WalletSignatureSchema.KaspaSchnorr],
  explorer: 'https://kas.fyi',
  rpcUrls: [],
  getTxLink: (txId: string) => {
    if (!txId?.trim()) return '';

    return `https://kas.fyi/transaction/${txId}`;
  },
  getAddressLink: (address: string) => {
    if (!address?.trim()) return '';

    return `https://kas.fyi/address/${address}`;
  }
};
export const KaspaTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Kaspa, ChainNetwork.KaspaTestNet),
  name: 'Kaspa Testnet',
  fullName: 'Kaspa Testnet 10',
  icon: '/chain-icons/Kaspa.svg',
  nativeAssetSymbol: 'KAS',
  nativeAssetDecimals: 8,
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Kaspa,
  supportedSignaturesSchemas: [WalletSignatureSchema.KaspaSchnorr],
  explorer: 'https://explorer-tn10.kaspa.org/',
  rpcUrls: [],
  getTxLink: (txId: string) => {
    if (!txId?.trim()) return '';

    return `https://explorer-tn10.kaspa.org/txs/${txId}`;
  },
  getAddressLink: (address: string) => {
    if (!address?.trim()) return '';

    return `https://explorer-tn10.kaspa.org/addresses/${address}`;
  }
};
