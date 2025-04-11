import { ChainInfo, ChainId, Chain, ChainNetwork, Ecosystem, WalletSignatureSchema } from "@delandlabs/coin-base/model";

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
  rpcUrls: ['https://ethereum.blockpi.network/v1/rpc/public'],
  wsRpcUrls: ['wss://ethereum-rpc.publicnode.com']
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
  ],
  wsRpcUrls: [
    'wss://ethereum-sepolia-rpc.publicnode.com',
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
  rpcUrls: ['https://bsc-dataseed.binance.org'],
  wsRpcUrls: ['wss://bsc-rpc.publicnode.com']
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
  rpcUrls: ['https://bsc-testnet.publicnode.com'],
  wsRpcUrls: ['wss://bsc-testnet-rpc.publicnode.com']
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
  rpcUrls: ['https://rpc.scroll.io'],
  wsRpcUrls: ['wss://scroll-rpc.publicnode.com']
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
  rpcUrls: ['https://sepolia-rpc.scroll.io'],
  wsRpcUrls: ['wss://scroll-sepolia-rpc.publicnode.com']
};

export const EthereumBase: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmBaseNet),
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
  rpcUrls: ['https://mainnet.base.org'],
  wsRpcUrls: ['wss://base-rpc.publicnode.com']
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
  rpcUrls: ['https://sepolia.base.org'],
  wsRpcUrls: ['wss://base-sepolia-rpc.publicnode.com']
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
  rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
  wsRpcUrls: ['wss://avalanche-c-chain-rpc.publicnode.com']
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
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  wsRpcUrls: ['wss://avalanche-fuji-c-chain-rpc.publicnode.com']
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
  rpcUrls: ['https://rpc.bitlayer.org'],
  wsRpcUrls: ['wss://ws.bitlayer.org']
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
  rpcUrls: ['https://testnet-rpc.bitlayer.org'],
  wsRpcUrls: ['wss://testnet-ws.bitlayer.org']
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

export const EthereumPanta: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmPantaNet),
  name: 'Panta',
  fullName: 'Panta Mainnet',
  icon: '/chain-icons/Panta.svg',
  nativeAssetSymbol: 'PANTA',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'http://pantascan.xyz/',
  rpcUrls: ['https://node2.panta.network'],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
};

export const EthereumNeoX: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmNeoXNet),
  name: 'NeoX',
  fullName: 'NeoX Mainnet',
  icon: '/chain-icons/NeoX.svg',
  nativeAssetSymbol: 'GAS',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://xexplorer.neo.org/',
  rpcUrls: ['https://mainnet-1.rpc.banelabs.org'],
  wsRpcUrls: ['wss://mainnet.wss1.banelabs.org'],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
};
export const EthereumNeoXTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmNeoXTestNet),
  name: 'NeoX Testnet',
  fullName: 'NeoX Testnet',
  icon: '/chain-icons/NeoX.svg',
  nativeAssetSymbol: 'GAS',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://xt4scan.ngd.network/',
  rpcUrls: ['https://neoxt4seed1.ngd.network'],
  wsRpcUrls: ['wss://neoxt4wss1.ngd.network'],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
};

export const EthereumKaia: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmKaiaNet),
  name: 'Igra',
  fullName: 'Igra Mainnet',
  icon: '/chain-icons/Igra.png',
  nativeAssetSymbol: 'KAIA',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://kaiascan.io/',
  rpcUrls: ['https://public-en.node.kaia.io'],
  wsRpcUrls: ['wss://klaytn.drpc.org'],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.Kaspa,
};
export const EthereumKaiaTestnet: ChainInfo = {
  chainId: new ChainId(Chain.Ethereum, ChainNetwork.EvmKaiaKairosTestNet),
  name: 'Igra Testnet',
  fullName: 'Igra Testnet',
  icon: '/chain-icons/Igra.png',
  nativeAssetSymbol: 'KAIA',
  nativeAssetDecimals: 18,
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://kairos.kaiascan.io/',
  rpcUrls: ['https://public-en-kairos.node.kaia.io'],
  wsRpcUrls: ['wss://responsive-green-emerald.kaia-kairos.quiknode.pro'],
  isMainnet: false,
  isNativeGas: true,
  ecosystem: Ecosystem.Kaspa,
};