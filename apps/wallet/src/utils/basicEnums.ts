export enum HibitEnv {
  PROD = 'prod',
  TEST = 'test',
  DEV = 'dev'
}

export enum RuntimeEnv {
  WEB = 'web',
  SDK = 'sdk',
}

export enum BlockNetwork {
  Mainnet = 'mainnet',
  Testnet = 'testnet'
}

/**
 * ex3 key signature schema
 */
export enum SignaturesSchema {
  Secp256k1
}

export enum WalletSignatureSchema {
  BtcEcdsa = '0x3e8',
  EvmEcdsa = '0x3e9',
  TronEcdsa = '0x3ea',
  TonEddsaOpenMask = '0x7d0',
  SolanaEddsa = '0x7da',
  IcpEddsa = '0x7e4'
}
