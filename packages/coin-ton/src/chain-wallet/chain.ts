import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from '@delandlabs/coin-base/model';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import TonWeb from 'tonweb';

export const Ton: ChainInfo = {
  chainId: new ChainId(Chain.Ton, ChainNetwork.TonMainNet),
  name: 'TON',
  fullName: 'The Open Mask',
  icon: '/chain-icons/Ton.svg',
  nativeAssetSymbol: 'TON',
  nativeAssetDecimals: 9,
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Ton,
  supportedSignaturesSchemas: [WalletSignatureSchema.TonEddsaOpenMask],
  explorer: 'https://tonviewer.com',
  rpcUrls: [],
  caseSensitiveAddress: true,
  getServerFormatAddress: (address: string): string | null => {
    try {
      return new TonWeb.utils.Address(address).toString(false, undefined, undefined, false);
    } catch (e) {
      return null;
    }
  },
  getTxLink: (txId: string) => {
    if (!txId?.trim()) return '';
    let hexTxId = txId;
    try {
      hexTxId = Buffer.from(txId, 'base64').toString('hex');
    } catch (e) {
      console.error(e);
    }
    return `https://tonviewer.com/transaction/${hexTxId}`;
  },
  getAddressLink: (address: string) => {
    if (!address?.trim()) return '';
    try {
      const bouncable = new TonWeb.utils.Address(address).toString(true, true, true, false);
      return `https://tonviewer.com/${bouncable}`;
    } catch (e) {
      return address;
    }
  }
};
export const TonTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Ton, ChainNetwork.TonTestNet),
  name: 'TON Testnet',
  fullName: 'The Open Mask Testnet',
  icon: '/chain-icons/Ton.svg',
  nativeAssetSymbol: 'TON',
  nativeAssetDecimals: 9,
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Ton,
  supportedSignaturesSchemas: [WalletSignatureSchema.TonEddsaOpenMask],
  explorer: 'https://testnet.tonviewer.com',
  rpcUrls: [],
  caseSensitiveAddress: true,
  getServerFormatAddress: (address: string): string | null => {
    try {
      return new TonWeb.utils.Address(address).toString(false, undefined, undefined, true);
    } catch (e) {
      return null;
    }
  },
  getTxLink: (txId: string) => {
    if (!txId?.trim()) return '';
    let hexTxId = txId;
    try {
      hexTxId = Buffer.from(txId, 'base64').toString('hex');
    } catch (e) {
      console.error(e);
    }
    return `https://testnet.tonviewer.com/transaction/${hexTxId}`;
  },
  getAddressLink: (address: string) => {
    if (!address?.trim()) return '';
    try {
      const bouncable = new TonWeb.utils.Address(address).toString(true, true, true, false);
      return `https://testnet.tonviewer.com/${bouncable}`;
    } catch (e) {
      return address;
    }
  }
};
(async () => {
  const [tonMainEndpoint, tonTestEndpoint] = await Promise.all([
    getHttpEndpoint(),
    getHttpEndpoint({ network: 'testnet' })
  ]);
  Ton.rpcUrls.push(tonMainEndpoint);
  TonTestnet.rpcUrls.push(tonTestEndpoint);
})();
