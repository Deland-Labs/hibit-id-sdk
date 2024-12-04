export enum HibitEnv {
  PROD = 'prod',
  TEST = 'test',
  DEV = 'dev'
}

export enum RuntimeEnv {
  WEB = 'web',
  SDK = 'sdk',
  ICRC_POSTMESSAGE = 'icrc_postmessage',
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
  IcpEddsa = '0x7e4',
  KaspaSchnorr = '0xbc2',
}

// TODO: Add support for other ecosystems
export enum Ecosystem {
  EVM = 'EVM',
  Bitcoin = 'Bitcoin',
  Solana = 'Solana',
  Tron = 'Tron',
  Ton = 'Ton',
  IC = 'Internet Computer',
  Kaspa = 'Kaspa',
}
