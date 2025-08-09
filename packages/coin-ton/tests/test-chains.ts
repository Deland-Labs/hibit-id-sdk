import { ChainInfo } from '@delandlabs/coin-base';
import {
  TonMainNet as TonMainNetId,
  TonTestNet as TonTestNetId,
  WalletSignatureSchema
} from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';
import { Address } from '@ton/core';

// Test-only ChainInfo configurations
// These are for testing purposes only and should not be used in production code
// In production, ChainInfo should be injected externally by the consuming application

// TON Mainnet Configuration for tests
export const TonMainNet: ChainInfo = {
  chainId: TonMainNetId,
  name: 'TON',
  fullName: 'The Open Network',
  icon: '/chain-icons/Ton.svg',
  nativeAssetSymbol: 'TON',
  supportedSignaturesSchemas: [WalletSignatureSchema.TonEddsaOpenMask],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Ton,
  explorer: 'https://tonviewer.com',
  rpc: {
    primary: 'https://toncenter.com/api/v2/jsonRPC'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash || txHash.trim() === '') return '';
    // Convert base64 to hex for tonviewer
    try {
      const hex = Buffer.from(txHash, 'base64').toString('hex');
      return `https://tonviewer.com/transaction/${hex}`;
    } catch {
      // If not valid base64, return as-is
      return `https://tonviewer.com/transaction/${txHash}`;
    }
  },
  getAddressLink: (address: string): string => {
    if (!address || address.trim() === '') return '';
    try {
      const tonAddress = Address.parse(address);
      const bounceableAddress = tonAddress.toString({ bounceable: true, testOnly: false });
      return `https://tonviewer.com/${bounceableAddress}`;
    } catch {
      return address; // Fallback to original address if parsing fails
    }
  }
};

// TON Testnet Configuration for tests
export const TonTestnet: ChainInfo = {
  chainId: TonTestNetId,
  name: 'TON Testnet',
  fullName: 'The Open Network Testnet',
  icon: '/chain-icons/Ton.svg',
  nativeAssetSymbol: 'TON',
  supportedSignaturesSchemas: [WalletSignatureSchema.TonEddsaOpenMask],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Ton,
  explorer: 'https://testnet.tonviewer.com',
  rpc: {
    primary: 'https://testnet.toncenter.com/api/v2/jsonRPC'
  },
  getTransactionLink: (txHash: string): string => {
    if (!txHash || txHash.trim() === '') return '';
    // Convert base64 to hex for tonviewer
    try {
      const hex = Buffer.from(txHash, 'base64').toString('hex');
      return `https://testnet.tonviewer.com/transaction/${hex}`;
    } catch {
      // If not valid base64, return as-is
      return `https://testnet.tonviewer.com/transaction/${txHash}`;
    }
  },
  getAddressLink: (address: string): string => {
    if (!address || address.trim() === '') return '';
    try {
      const tonAddress = Address.parse(address);
      const bounceableAddress = tonAddress.toString({ bounceable: true, testOnly: true });
      return `https://testnet.tonviewer.com/${bounceableAddress}`;
    } catch {
      return address; // Fallback to original address if parsing fails
    }
  }
};
