import { ChainInfo } from '@delandlabs/coin-base';
import { ChainType, ChainNetwork, ChainId, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';

// Test-only ChainInfo configurations
// These are for testing purposes only and should not be used in production code
// In production, ChainInfo should be injected externally by the consuming application

// Internet Computer (Dfinity) Mainnet Configuration for tests
export const Dfinity: ChainInfo = {
  chainId: new ChainId(ChainType.Dfinity, ChainNetwork.DfinityMainNet),
  name: 'Internet Computer',
  fullName: 'Internet Computer Mainnet',
  icon: '/chain-icons/IC.svg',
  nativeAssetSymbol: 'ICP',
  supportedSignaturesSchemas: [WalletSignatureSchema.IcpEddsa],
  isMainnet: true,
  isNativeGas: false,
  ecosystem: Ecosystem.ICP,
  explorer: 'https://www.icexplorer.io',
  rpc: {
    primary: 'https://ic0.app'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash) return '';
    const cleanHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
    return `https://www.icexplorer.io/transactions/details/${cleanHash}`;
  },
  getAddressLink: (address: string): string => {
    if (!address) return '';
    return `https://www.icexplorer.io/address/details/${address}`;
  }
};
