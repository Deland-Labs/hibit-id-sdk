import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from "@delandlabs/coin-base";

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
  explorer: 'https://explorer.kaspa.org',
  rpcUrls: [],
  getTxLink: (txId: string) => {
    if (typeof txId !== 'string') {
      return ''
    }
    return `https://explorer.kaspa.org/txs/${txId}`
  },
  getAddressLink: (address: string) => {
    if (typeof address !== 'string') {
      return ''
    }
    return `https://explorer.kaspa.org/addresses/${address}`
  },
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
    if (typeof txId !== 'string') {
      return ''
    }
    return `https://explorer-tn10.kaspa.org/txs/${txId}`
  },
  getAddressLink: (address: string) => {
    if (typeof address !== 'string') {
      return ''
    }
    return `https://explorer-tn10.kaspa.org/addresses/${address}`
  },
};
