export enum ClientExposeRPCMethod {
  CLOSE = 'close',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  IFRAME_READY = 'iframeReady',
  LOGIN_CHANGED = 'loginChanged',
  CHAIN_CHANGED = 'chainChanged',
  ACCOUNTS_CHANGED = 'accountsChanged',
}

export enum HibitIdExposeRPCMethod {
  GET_ACCOUNT = 'getAccount',
  GET_CHAIN_INFO = 'getChainInfo',
  CONNECT = 'connect',
  GET_BALANCE = 'getBalance',
  TRANSFER = 'transfer',
  DISCONNECT = 'disconnect',
  SIGN_MESSAGE = 'signMessage',
  SWITCH_CHAIN = 'switchChain',
}

export enum AuthenticatorType {
  Telegram = 'Telegram',
  Google = 'Google',
  Facebook = 'Facebook',
  Apple = 'Apple',
  X = 'X',
  // Add more authenticators here
}

export enum HibitIdAssetType {
  Native = 0,
  NativeGas = 1,
  ERC20 = 3,
  ERC721 = 4,
  DFT = 5,
  ICRC1 = 6,
  BRC20 = 7,
  SPL = 8,
  TRC20 = 9,
  Jetton = 10,
}

export enum HibitIdChainId {
  BitcoinMainnet = '0_1',
  BitcoinTestnet = '0_2',

  Ethereum = '60_1',
  EthereumSepolia = '60_11155111',
  EthereumBsc = '60_56',
  EthereumBscTestnet = '60_97',
  EthereumBase = '60_8453',
  EthereumBaseSepolia = '60_84532',
  EthereumAvalanche = '60_43114',
  EthereumAvalancheFuji = '60_43113',
  EthereumScroll = '60_534352',
  EthereumScrollSepolia = '60_534351',
  EthereumBitlayer = '60_200901',
  EthereumBitlayerTestnet = '60_200810',

  SolanaMainnet = '501_3',
  SolanaTestnet = '501_2',

  DfinityMainnet = '223_1',

  TonMainnet = '607_1',
  TonTestnet = '607_2',

  TronMainnet = '195_728126428',
  TronShastaTestnet = '195_2494104990',
  TronNileTestnet = '195_3448148188',
}

export enum HibitIdErrorCode {
  USER_CANCEL_CONNECTION = 'USER_CANCEL_CONNECTION',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
}
