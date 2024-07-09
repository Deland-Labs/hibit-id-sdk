export enum HibitEnv {
  PROD = 'prod',
  TEST = 'test',
  DEV = 'dev'
}

export enum RuntimeEnv {
  WEB = 'web',
  SDK = 'sdk',
  TELEGRAM_MINI_APP = 'telegram-mini-app',
}

export enum BlockNetwork {
  Mainnet = 'mainnet',
  Testnet = 'testnet'
}

export enum SignaturesSchema {
  Ed25519,
  Secp256k1,
  /**
   * @deprecated will be removed next version
   */
  Ethereum
}

export enum StringFormat {
  Hex = 1,
  Base58,
}

export enum WalletSignatureSchema {
  Ecdsa = '0xa',
  Eddsa = '0x14'
}
