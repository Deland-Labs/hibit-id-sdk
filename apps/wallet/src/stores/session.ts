import { makeAutoObservable } from "mobx";
import { HibitIdAuth } from "../utils/auth/types";
import { ChainWallet } from "../utils/chain/chain-wallets/types";
import { Chain, ChainInfo } from "../utils/basicTypes";
import { EthereumSepolia } from "../utils/chain/chain-list";
import { EthereumChainWallet } from "../utils/chain/chain-wallets/ethereum";

const AUTH_STORE_KEY = 'hibitid-auth'

export class HibitIdSession {
  public wallet: ChainWallet | null = null
  public auth: HibitIdAuth | null = null
  public chainInfo: ChainInfo

  constructor() {
    makeAutoObservable(this)
    this.chainInfo = EthereumSepolia
    // load auth from session
    const authString = sessionStorage.getItem(AUTH_STORE_KEY)
    if (authString) {
      this.auth = JSON.parse(authString) as HibitIdAuth
      this.wallet = this.initWallet(this.auth)
    }
  }

  get isConnected() {
    return !!this.wallet
  }

  get validAddress() {
    if (!this.wallet) return ''
    return this.chainInfo.caseSensitiveAddress
      ? this.wallet.getAddress()
      : this.wallet.getAddress().toLowerCase()
  }

  public connect = (auth: HibitIdAuth) => {
    this.auth = auth
    this.wallet = this.initWallet(auth)
    console.log('[session connected]', this.auth)
    sessionStorage.setItem(AUTH_STORE_KEY, JSON.stringify(this.auth))
  }

  private initWallet = (auth: HibitIdAuth): ChainWallet => {
    if (!auth?.phrase) {
      throw new Error('Invalid auth')
    }
    if (this.chainInfo.chainId.type.equals(Chain.Ethereum)) {
      return new EthereumChainWallet(this.chainInfo, auth.phrase)
    }
    throw new Error('Unsupported chain')
  }
}

const hibitIdSession = new HibitIdSession()
export default hibitIdSession
