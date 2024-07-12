import { HibitIdAssetType, HibitIdChainId } from "./enums"

export type HibitEnv = 'dev' | 'test' | 'prod'
export type HibitIdPage = 'main' | 'login'

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

export interface ConnectResponse {
  address: string
  publicKey?: string
}

export interface SignMessageRequest {
  message: string
}

export interface SignMessageResponse {
  signature: string
}

export interface GetBalanceRequest {
  assetType?: HibitIdAssetType
  chainId?: HibitIdChainId
  contractAddress?: string
  decimalPlaces?: number
}

export interface GetBalanceResponse {
  balance: string // in minimal unit (like wei for eth)
}

export interface TransferRequest {
  toAddress: string
  amount: string // in minimal unit (like wei for eth)
  assetType?: HibitIdAssetType
  chainId?: HibitIdChainId
  contractAddress?: string
  decimalPlaces?: number
}

export interface TransferResponse {
  txHash: string
}
