import BigNumber from "bignumber.js";
import { RootAssetInfo } from "../../apis/models";
import { makeAutoObservable } from "mobx";
import { useQuery } from "@tanstack/react-query";
import hibitIdSession from "../../stores/session";

export interface SendTokenState {
  token: RootAssetInfo | null
  toAddress: string
  amount: string
}

export class SendTokenStore {
  state: SendTokenState = {
    token: null,
    toAddress: '',
    amount: '',
  }

  constructor() {
    makeAutoObservable(this)
  }

  setState = (state: SendTokenState) => {
    this.state = { ...state }
  }

  reset = () => {
    this.state = {
      token: null,
      toAddress: '',
      amount: '',
    }
  }
}

export const sendTokenStore = new SendTokenStore()

export const useFeeQuery = (toAddress: string, amount: string, token: RootAssetInfo | null) => {
  return useQuery({
    queryKey: ['estimatedFee', toAddress, amount, token],
    queryFn: async () => {
      if (!hibitIdSession.walletPool || !token) {
        return null
      }
      return await hibitIdSession.walletPool.getEstimatedFee(
        toAddress,
        new BigNumber(amount),
        token,
      )
    },
    staleTime: 10000,
    refetchInterval: 5000,
  })
}
