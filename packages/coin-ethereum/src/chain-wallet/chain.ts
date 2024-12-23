import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from "@delandlabs/coin-base";

export const Ethereum: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmMainNet),
  name: 'Ethereum',
  fullName: 'Ethereum Mainnet',
  icon: '/chain-icons/Ethereum.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://sepolia.etherscan.io',
  rpcUrls: [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://1rpc.io/sepolia',
    'https://endpoints.omniatech.io/v1/eth/sepolia/public',
  ]
};

export const EthereumBsc: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmBscNet),
  name: 'BSC',
  fullName: 'BNB Smart Chain',
  icon: '/chain-icons/BNB.svg',
  nativeAssetSymbol: 'BNB',
  nativeAssetDecimals: 18,
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
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
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Bitcoin,
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
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Bitcoin,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://testnet.btrscan.com',
  rpcUrls: ['https://testnet-rpc.bitlayer.org']
};

export const EthereumSwan: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmSwanNet),
  name: 'Swan',
  fullName: 'Swan Mainnet',
  icon: '/chain-icons/Swan.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://swanscan.io',
  rpcUrls: ['https://mainnet-rpc.swanchain.org']
};
export const EthereumSwanTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmSwanTestNet),
  name: 'Swan Testnet',
  fullName: 'Swan Proxima Testnet',
  icon: '/chain-icons/Swan.svg',
  nativeAssetSymbol: 'ETH',
  nativeAssetDecimals: 18,
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://proxima-explorer.swanchain.io',
  rpcUrls: ['https://rpc-proxima.swanchain.io']
};
