import { makeAutoObservable } from "mobx";
import { HibitIdAuth } from "../utils/auth/types";
import { ChainWallet } from "../utils/chain/chain-wallets/types";
import { Chain, ChainInfo } from "../utils/basicTypes";
import { EthereumSepolia } from "../utils/chain/chain-list";
import { EthereumChainWallet } from "../utils/chain/chain-wallets/ethereum";
import { RUNTIME_ENV } from "../utils/runtime";
import { RuntimeEnv } from "../utils/basicEnums";
import rpcManager from "./rpc";

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
    return !!this.wallet && (RUNTIME_ENV === RuntimeEnv.SDK ? rpcManager.authorized : true)
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

  public disconnect = () => {
    this.auth = null
    this.wallet = null
    sessionStorage.removeItem(AUTH_STORE_KEY)
  }

  private initWallet = (auth: HibitIdAuth): ChainWallet => {
    try {
      if (!auth?.phrase) {
        throw new Error('Invalid auth')
      }
  
      let wallet: ChainWallet | null = null
      // TODO: add more chains
      if (this.chainInfo.chainId.type.equals(Chain.Ethereum)) {
        wallet = new EthereumChainWallet(this.chainInfo, auth.phrase)
      }
  
      if (!wallet) {
        throw new Error('Unsupported chain')
      }
      if (RUNTIME_ENV === RuntimeEnv.SDK) {
        rpcManager.resolveConnect({ address: wallet.getAddress() })
      }
      return wallet
    } catch (e) {
      if (RUNTIME_ENV === RuntimeEnv.SDK) {
        rpcManager.rejectConnect(e instanceof Error ? e.message : JSON.stringify(e))
      }
      throw e
    }
  }
}

const hibitIdSession = new HibitIdSession()
export default hibitIdSession
