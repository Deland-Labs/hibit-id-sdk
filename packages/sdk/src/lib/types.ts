import { HibitIdAssetType, HibitIdChainId } from "./enums"

export type HibitEnv = 'dev' | 'test' | 'prod'

export interface HibitIdWalletOptions {
  env: HibitEnv
  chains: HibitIdChainId[]
  defaultChain: HibitIdChainId
  iframeUrlAppendix?: string
}

export interface HibitIdAuth {
  token: string
  expiresAt: number
}

export interface HibitIdEventHandlerMap {
  'chainChanged': (chainId: HibitIdChainId) => void
  'accountsChanged': (account: WalletAccount | null) => void
}

export class BridgePromise<T> {
  public promise: Promise<T>
  public resolve: (value: T) => void = () => {}
  public reject: (reason?: string) => void = () => {}

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

export interface ChainInfo {
  chainId: {
    type: number
    network: number
  }
  name: string
  fullName: string
  nativeAssetSymbol: string
  nativeAssetDecimals: number
  explorer: string
  rpcUrls: string[]
}

export interface AuthParty {
  key: string
  name: string
  icon: string
}

export interface WalletAccount {
  address: string
  publicKey?: string
}

export type RpcBaseResponse<T> = {
  success: false
  errMsg: string
} | {
  success: true
  data: T
}

export interface ConnectRequest {
  chainId: HibitIdChainId
}

export interface ConnectedRequest extends WalletAccount {}

export interface SignMessageRequest {
  message: string
  chainId?: HibitIdChainId
}

export type SignMessageResponse = RpcBaseResponse<{
  signature: string
}>

export interface GetBalanceRequest {
  assetType?: HibitIdAssetType
  chainId?: HibitIdChainId
  contractAddress?: string
  decimalPlaces?: number
}

export type GetBalanceResponse = RpcBaseResponse<{
  balance: string // in minimal unit (like wei for eth)
}>

export interface TransferRequest {
  toAddress: string
  amount: string // in minimal unit (like wei for eth)
  assetType?: HibitIdAssetType
  chainId?: HibitIdChainId
  contractAddress?: string
  decimalPlaces?: number
}

export type TransferResponse = RpcBaseResponse<{
  txHash: string
}>

export type GetAccountRequest = {
  chainId?: HibitIdChainId
}

export type GetAccountResponse = RpcBaseResponse<WalletAccount>

export type GetChainInfoResponse = RpcBaseResponse<{
  chainInfo: ChainInfo
}>

export interface ChainChangedRequest {
  chainId: HibitIdChainId
}

export interface AccountsChangedRequest {
  account: WalletAccount | null
}

export interface SwitchChainRequest {
  chainId: HibitIdChainId
}

export interface LoginChangedRequest {
  isLogin: boolean
  sub?: string  // required if isLogin is true
}
