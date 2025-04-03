import { WalletAccount } from "@delandlabs/coin-base"
import { AuthenticatorType, HibitIdAssetType, HibitIdChainId, HibitIdErrorCode } from "./enums"
import { TonConnectSignDataPayload, TonConnectSignDataResult, TonConnectTransactionPayload } from "./tonconnect/types"

export type HibitEnv = 'dev' | 'test' | 'prod'

export type Language = 'en' | 'cnt' | 'ja' | 'ru'
// whether to fix the dev mode to 'off' or 'on'
export type FixDevMode = 'on' | 'off' | 'unset'
// float: show the wallet in a floating window with controller button
// background: make wallet invisible most of the time except login process and password reset, only controllable through SDK
// default to 'float'
export type EmbedMode = 'float' | 'background'

export interface HibitIdWalletOptions {
  env: HibitEnv
  chains: HibitIdChainId[]
  defaultChain: HibitIdChainId
  lang?: Language
  fixDevMode?: FixDevMode
  iframeUrlAppendix?: string
  embedMode?: EmbedMode
  controllerDefaultPosition?: { right: number, bottom: number }
}

export interface HibitIdAuth {
  token: string
  expiresAt: number
}

export interface BalanceChangeData {
  request: GetBalanceRequest
  balance: string
  lastBalance: string | null
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

export class HibitIdError extends Error {
  constructor(public code: HibitIdErrorCode, message: string) {
    super(message) 
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

export type RpcBaseResponse<T> = {
  success: false
  errMsg: string
} | {
  success: true
  data: T
}

export interface ConnectRequest {
  chainId: HibitIdChainId
  authType?: AuthenticatorType
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
  payload?: string
}

export type TransferResponse = RpcBaseResponse<{
  txHash: string
}>

export type GetEstimatedFeeRequest = TransferRequest

export type GetEstimatedFeeResponse = RpcBaseResponse<{
  fee: string // in minimal unit (like wei for eth)
}>

export interface VerifyPasswordRequest {
  password: string
}

export type VerifyPasswordResponse = RpcBaseResponse<null>

export type TonConnectGetStateInitResponse = RpcBaseResponse<{
  stateInitBase64: string
}>

export type TonConnectTransferRequest = TonConnectTransactionPayload

export type TonConnectTransferResponse = RpcBaseResponse<{
  message: string
}>

export type TonConnectSignDataRequest = TonConnectSignDataPayload

export type TonConnectSignDataResponse = RpcBaseResponse<TonConnectSignDataResult>

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

export interface PasswordChangedRequest {
  success: boolean
}

export interface SwitchChainRequest {
  chainId: HibitIdChainId
}

export interface LoginChangedRequest {
  isLogin: boolean
  sub?: string  // required if isLogin is true
}

export interface SetBackgroundEmbedRequest {
  value: boolean
}
