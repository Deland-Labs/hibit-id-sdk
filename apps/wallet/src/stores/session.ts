import { HDNodeWallet } from "ethers";
import { makeAutoObservable } from "mobx";
import { Ex3Account } from "../apis/types";

export interface HibitIdAuth {
  credentialId: string
  phrase: string
}

export class HibitIdSession {
  public wallet: HDNodeWallet | null = null
  public auth: HibitIdAuth | null = null
  public ex3Account: Ex3Account | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get isConnected() {
    return !!this.wallet
  }

  get isEx3Authenticated() {
    return !!this.ex3Account
  }

  get validAddress() {
    return this.wallet?.address.toLowerCase() ?? ''
  }

  public connect = (auth: HibitIdAuth) => {
    this.auth = auth
    this.wallet = HDNodeWallet.fromPhrase(auth.phrase)
  }

  public setEx3Account = (account: Ex3Account) => {
     this.ex3Account = account
  }
}

const hibitIdSession = new HibitIdSession()
export default hibitIdSession
