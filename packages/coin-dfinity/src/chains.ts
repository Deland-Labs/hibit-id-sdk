import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from '@delandlabs/coin-base/model';

export const Dfinity: ChainInfo = {
  chainId: new ChainId(Chain.Dfinity, ChainNetwork.DfinityMainNet),
  name: 'InternetComputer',
  fullName: 'InternetComputer Mainnet',
  icon: '/chain-icons/IC.svg',
  nativeAssetSymbol: 'ICP',
  nativeAssetDecimals: 8,
  isMainnet: true,
  isNativeGas: false,
  ecosystem: Ecosystem.IC,
  supportedSignaturesSchemas: [WalletSignatureSchema.IcpEddsa],
  explorer: 'https://www.icexplorer.io',
  rpcUrls: ['https://ic0.app'],
  getTxLink: (txId: string) => {
    if (!txId) return '';
    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://www.icexplorer.io/transactions/details/${hash}`;
  },
  getAddressLink: (address: string) => {
    if (!address) return '';
    return `https://www.icexplorer.io/address/details/${address}`;
  }
};
