import { RootAssetInfo } from "../../apis/models";
import { makeAutoObservable } from "mobx";

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
