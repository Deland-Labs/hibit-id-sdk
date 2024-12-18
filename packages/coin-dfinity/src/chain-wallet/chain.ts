import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from '@delandlabs/coin-base';

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
  explorer: 'https://dashboard.internetcomputer.org',
  rpcUrls: ['https://ic0.app'],
  getTxLink: (txId: string) => {
    if (!txId) return '';
    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://dashboard.internetcomputer.org/transaction/${hash}`;
  },
  getAddressLink: (address: string) => {
    if (!address) return '';
    return `https://dashboard.internetcomputer.org/account/${address}`;
  }
};
