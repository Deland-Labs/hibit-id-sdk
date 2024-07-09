import { HDNodeWallet } from "ethers";
import { makeAutoObservable } from "mobx";
import { HibitIdAuth } from "../utils/auth/types";

const AUTH_STORE_KEY = 'hibitid-auth'

export class HibitIdSession {
  public wallet: HDNodeWallet | null = null
  public auth: HibitIdAuth | null = null

  constructor() {
    makeAutoObservable(this)

    // load auth from session
    const authString = sessionStorage.getItem(AUTH_STORE_KEY)
    if (authString) {
      this.auth = JSON.parse(authString) as HibitIdAuth
      this.wallet = HDNodeWallet.fromPhrase(this.auth.phrase)
    }
  }

  get isConnected() {
    return !!this.wallet
  }

  get validAddress() {
    return this.wallet?.address.toLowerCase() ?? ''
  }

  public connect = (auth: HibitIdAuth) => {
    this.auth = auth
    this.wallet = HDNodeWallet.fromPhrase(auth.phrase)
    console.log('[session connected]', this.auth)
    sessionStorage.setItem(AUTH_STORE_KEY, JSON.stringify(this.auth))
  }
}

const hibitIdSession = new HibitIdSession()
export default hibitIdSession
