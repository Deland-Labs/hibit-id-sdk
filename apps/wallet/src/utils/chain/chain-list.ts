import { WalletSignatureSchema } from "../basicEnums";
import { ChainInfo, ChainId, Chain, ChainNetwork } from "../basicTypes";
import { clusterApiUrl } from '@solana/web3.js';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import TonWeb from 'tonweb'

export const Ethereum: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmMainNet),
  name: 'Ethereum',
  fullName: 'Ethereum Mainnet',
  icon: '/chain-icons/Ethereum.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://etherscan.io',
  rpcUrls: ['https://ethereum.blockpi.network/v1/rpc/public']
};
export const EthereumSepolia: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmSepoliaNet),
  name: 'ETH Sepolia',
  fullName: 'ETH Sepolia Testnet',
  icon: '/chain-icons/Ethereum.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://sepolia.etherscan.io',
  rpcUrls: ['https://ethereum-sepolia.blockpi.network/v1/rpc/public	']
};

export const EthereumBsc: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmBscNet),
  name: 'BSC',
  fullName: 'BNB Smart Chain',
  icon: '/chain-icons/BNB.svg',
  nativeAssetSymbol: 'BNB',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://bscscan.com',
  rpcUrls: ['https://bsc-dataseed.binance.org']
};
export const EthereumBscTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmBscTestNet),
  name: 'BSC Testnet',
  fullName: 'BNB Smart Chain Testnet',
  icon: '/chain-icons/BNB.svg',
  nativeAssetSymbol: 'tBNB',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://testnet.bscscan.com',
  rpcUrls: ['https://bsc-testnet.publicnode.com']
};

export const EthereumScroll: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmScrollNet),
  name: 'Scroll',
  fullName: 'Scroll Mainnet',
  icon: '/chain-icons/Scroll.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://scroll.l2scan.co',
  rpcUrls: ['https://rpc.scroll.io']
};
export const EthereumScrollSepolia: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmScrollSepoliaNet),
  name: 'Scroll Sepolia',
  fullName: 'Scroll Sepolia Testnet',
  icon: '/chain-icons/Scroll.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://scroll-sepolia.l2scan.co',
  rpcUrls: ['https://sepolia-rpc.scroll.io']
};

export const EthereumBase: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmBscNet),
  name: 'Base',
  fullName: 'Base Mainnet',
  icon: '/chain-icons/Base.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://basescan.org',
  rpcUrls: ['https://mainnet.base.org']
};
export const EthereumBaseSepolia: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmBaseSepoliaNet),
  name: 'Base Sepolia',
  fullName: 'Base Sepolia Testnet',
  icon: '/chain-icons/Base.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://sepolia.basescan.org',
  rpcUrls: ['https://sepolia.base.org']
};

export const EthereumAvalanche: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmAvalancheNet),
  name: 'Avalanche',
  fullName: 'Avalanche C-Chain',
  icon: '/chain-icons/Avalanche.svg',
  nativeAssetSymbol: 'AVAX',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://snowtrace.io',
  rpcUrls: ['https://api.avax.network/ext/bc/C/rpc']
};
export const EthereumAvalancheFuji: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmAvalancheFujiNet),
  name: 'Avalanche Fuji',
  fullName: 'Avalanche Testnet C-Chain',
  icon: '/chain-icons/Avalanche.svg',
  nativeAssetSymbol: 'AVAX',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://subnets-test.avax.network/c-chain',
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc']
};

export const EthereumBitlayer: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmBitlayerNet),
  name: 'Bitlayer',
  fullName: 'Bitlayer Mainnet',
  icon: '/chain-icons/Bitlayer.png',
  nativeAssetSymbol: 'BTC',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://btrscan.com',
  rpcUrls: ['https://rpc.bitlayer.org']
};
export const EthereumBitlayerTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmBitlayerTestNet),
  name: 'Bitlayer Testnet',
  fullName: 'Bitlayer Testnet',
  icon: '/chain-icons/Bitlayer.png',
  nativeAssetSymbol: 'BTC',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://testnet.btrscan.com',
  rpcUrls: ['https://testnet-rpc.bitlayer.org']
};

export const Bitcoin: ChainInfo = {
  chainId: new ChainId(Chain.Bitcoin, ChainNetwork.BtcMainNet),
  name: 'Bitcoin',
  fullName: 'Bitcoin Mainnet',
  icon: '/chain-icons/Bitcoin.svg',
  nativeAssetSymbol: 'BTC',
  nativeAssetDecimals: 8,
  supportedSignaturesSchemas: [WalletSignatureSchema.BtcEcdsa],
  explorer: 'https://blockstream.info',
  rpcUrls: []
};
export const BitcoinTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Bitcoin, ChainNetwork.BtcTestNet),
  name: 'BitcoinTestnet',
  fullName: 'Bitcoin Testnet',
  icon: '/chain-icons/Bitcoin.svg',
  nativeAssetSymbol: 'BTC',
  nativeAssetDecimals: 8,
  supportedSignaturesSchemas: [WalletSignatureSchema.BtcEcdsa],
  explorer: 'https://blockstream.info/testnet',
  rpcUrls: []
};

export const Solana: ChainInfo = {
  chainId: new ChainId(Chain.Solana, ChainNetwork.SolanaMainNet),
  name: 'Solana',
  fullName: 'Solana Mainnet',
  icon: '/chain-icons/Solana.svg',
  nativeAssetSymbol: 'SOL',
  nativeAssetDecimals: 9,
  supportedSignaturesSchemas: [WalletSignatureSchema.SolanaEddsa],
  explorer: 'https://explorer.solana.com',
  rpcUrls: [clusterApiUrl('mainnet-beta')],
  caseSensitiveAddress: true
};
export const SolanaTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Solana, ChainNetwork.SolanaTestNet),
  name: 'SolanaTestnet',
  fullName: 'Solana Testnet',
  icon: '/chain-icons/Solana.svg',
  nativeAssetSymbol: 'SOL',
  nativeAssetDecimals: 9,
  supportedSignaturesSchemas: [WalletSignatureSchema.SolanaEddsa],
  explorer: 'https://explorer.solana.com?cluster=testnet',
  rpcUrls: [clusterApiUrl('testnet')],
  caseSensitiveAddress: true
};

export const Ton: ChainInfo = {
  chainId: new ChainId(Chain.Ton, ChainNetwork.TonMainNet),
  name: 'TON',
  fullName: 'The Open Mask',
  icon: '/chain-icons/Ton.svg',
  nativeAssetSymbol: 'TON',
  nativeAssetDecimals: 9,
  supportedSignaturesSchemas: [WalletSignatureSchema.TonEddsaOpenMask],
  explorer: 'https://tonviewer.com',
  rpcUrls: [],
  caseSensitiveAddress: true,
  getServerFormatAddress: (address: string): string | null => {
    try {
      return new TonWeb.utils.Address(address).toString(
        false,
        undefined,
        undefined,
        false
      );
    } catch (e) {
      return null;
    }
  },
  getTxLink: (txId: string) => {
    if (!txId) {
      return '';
    }
    let hexTxId = txId;
    try {
      hexTxId = Buffer.from(txId, 'base64').toString('hex');
    } catch (e) {
      console.error(e);
    }
    return `https://tonviewer.com/transaction/${hexTxId}`;
  },
  getAddressLink: (address: string) => {
    try {
      const bouncable = new TonWeb.utils.Address(address).toString(
        true,
        true,
        true,
        false
      );
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
  supportedSignaturesSchemas: [WalletSignatureSchema.TonEddsaOpenMask],
  explorer: 'https://testnet.tonviewer.com',
  rpcUrls: [],
  caseSensitiveAddress: true,
  getServerFormatAddress: (address: string): string | null => {
    try {
      return new TonWeb.utils.Address(address).toString(
        false,
        undefined,
        undefined,
        true
      );
    } catch (e) {
      return null;
    }
  },
  getTxLink: (txId: string) => {
    if (!txId) {
      return '';
    }
    let hexTxId = txId;
    try {
      hexTxId = Buffer.from(txId, 'base64').toString('hex');
    } catch (e) {
      console.error(e);
    }
    return `https://testnet.tonviewer.com/transaction/${hexTxId}`;
  },
  getAddressLink: (address: string) => {
    try {
      const bouncable = new TonWeb.utils.Address(address).toString(
        true,
        true,
        true,
        false
      );
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

export const Tron: ChainInfo = {
  chainId: new ChainId(Chain.Tron, ChainNetwork.TronMainNet),
  name: 'Tron',
  fullName: 'Tron Mainnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  nativeAssetDecimals: 6,
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  explorer: 'https://tronscan.org',
  rpcUrls: ['https://rpc.trongrid.io'],
  caseSensitiveAddress: true,
  getTxLink: (txId: string) => {
    if (typeof txId !== 'string') {
      return ''
    }
    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://tronscan.org/#/transaction/${hash}`
  },
  getAddressLink: (address: string) => {
    if (typeof address !== 'string') {
      return ''
    }
    return `https://tronscan.org/#/address/${address}`
  },
};
export const TronShasta: ChainInfo = {
  chainId: new ChainId(Chain.Tron, ChainNetwork.TronShastaTestNet),
  name: 'TronShasta',
  fullName: 'Tron Shasta Testnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  nativeAssetDecimals: 6,
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  explorer: 'https://shasta.tronscan.org',
  rpcUrls: ['https://api.shasta.trongrid.io'],
  caseSensitiveAddress: true,
  getTxLink: (txId: string) => {
    if (typeof txId !== 'string') {
      return ''
    }
    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://shasta.tronscan.org/#/transaction/${hash}`
  },
  getAddressLink: (address: string) => {
    if (typeof address !== 'string') {
      return ''
    }
    return `https://shasta.tronscan.org/#/address/${address}`
  },
};
export const TronNile: ChainInfo = {
  chainId: new ChainId(Chain.Tron, ChainNetwork.TronNileTestNet),
  name: 'TronNile',
  fullName: 'Tron Nile Testnet',
  icon: '/chain-icons/Tron.svg',
  nativeAssetSymbol: 'TRX',
  nativeAssetDecimals: 6,
  supportedSignaturesSchemas: [WalletSignatureSchema.TronEcdsa],
  explorer: 'https://nile.tronscan.org',
  rpcUrls: ['https://api.nileex.io'],
  caseSensitiveAddress: true,
  getTxLink: (txId: string) => {
    if (typeof txId !== 'string') {
      return ''
    }
    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://nile.tronscan.org/#/transaction/${hash}`
  },
  getAddressLink: (address: string) => {
    if (typeof address !== 'string') {
      return ''
    }
    return `https://nile.tronscan.org/#/address/${address}`
  },
}

export const Dfinity: ChainInfo = {
  chainId: new ChainId(Chain.Dfinity, ChainNetwork.DfinityMainNet),
  name: 'Dfinity',
  fullName: 'Dfinity Mainnet',
  icon: '/chain-icons/IC.svg',
  nativeAssetSymbol: 'ICP',
  nativeAssetDecimals: 8,
  supportedSignaturesSchemas: [WalletSignatureSchema.IcpEddsa],
  explorer: 'https://dashboard.internetcomputer.org',
  rpcUrls: [],
  getTxLink: (txId: string) => {
    if (typeof txId !== 'string') {
      return ''
    }
    const hash = txId.startsWith('0x') ? txId.slice(2) : txId;
    return `https://dashboard.internetcomputer.org/transaction/${hash}`
  },
  getAddressLink: (address: string) => {
    if (typeof address !== 'string') {
      return ''
    }
    return `https://dashboard.internetcomputer.org/account/${address}`
  },
};
