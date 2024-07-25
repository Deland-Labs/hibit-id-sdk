import { makeAutoObservable, reaction } from "mobx";
import { ChainWallet } from "../utils/chain/chain-wallets/types";
import { Chain, ChainInfo } from "../utils/basicTypes";
import { EthereumSepolia } from "../utils/chain/chain-list";
import { EthereumChainWallet } from "../utils/chain/chain-wallets/ethereum";
import { RUNTIME_ENV } from "../utils/runtime";
import { RuntimeEnv } from "../utils/basicEnums";
import rpcManager from "./rpc";
import { UserAuthInfo } from "sdk";
import { WEB_STORAGE_KEY } from "../utils/constants";
import { TonChainWallet } from "../utils/chain/chain-wallets/ton";
import { WalletAccount } from "sdk";

export class HibitIdSession {
  public wallet: ChainWallet | null = null
  public auth: UserAuthInfo | null = null
  public chainInfo: ChainInfo

  private _account: WalletAccount | null = null

  constructor() {
    makeAutoObservable(this)
    this.chainInfo = EthereumSepolia

    if (RUNTIME_ENV === RuntimeEnv.SDK) {
      // re-init rpcManager to avoid stale callback closure
      reaction(
        () => this.wallet,
        (wallet) => {
          if (wallet) {
            rpcManager.init()
          }
        }
      )
    }
  }

  get isConnected() {
    return !!this.wallet
  }

  get address() {
    return this._account?.address || ''
  }

  public getValidAddress = async () => {
    if (!this._account) return ''
    return this.chainInfo.caseSensitiveAddress
      ? this._account.address
      : this._account.address.toLowerCase()
  }

  public connect = async (auth: UserAuthInfo) => {
    this.auth = auth
    this.wallet = await this.initWallet(this.chainInfo, auth)
    this._account = await this.wallet.getAccount()
    console.log('[session connected]', this.auth)
    if (RUNTIME_ENV === RuntimeEnv.WEB) {
      sessionStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(this.auth))
    }
  }

  public disconnect = () => {
    this.auth = null
    this.wallet = null
    this._account = null
    if (RUNTIME_ENV === RuntimeEnv.WEB) {
      sessionStorage.removeItem(WEB_STORAGE_KEY)
    }
  }

  public switchChain = async (chain: ChainInfo) => {
    if (this.chainInfo.chainId.equals(chain.chainId)) return
    if (!this.auth) {
      throw new Error('Not connected')
    }
    this.wallet = await this.initWallet(chain, this.auth)
    const oldAddress = this._account?.address
    this._account = await this.wallet.getAccount()
    this.chainInfo = chain
    if (RUNTIME_ENV === RuntimeEnv.SDK) {
      rpcManager.notifyChainChanged(chain)
      if (oldAddress !== this._account.address) {
        rpcManager.notifyAccountsChanged(this._account)
      }
    }
  }

  private initWallet = async (chainInfo: ChainInfo, auth: UserAuthInfo): Promise<ChainWallet> => {
    try {
      // TODO: trade userInfo for wallet phrase
      console.log('[query phrase with]', auth)
      const phrase = await Promise.resolve('mail man solid begin spatial uncle border pupil cause public tuition soda')

      let wallet: ChainWallet | null = null
      // TODO: add more chains
      if (chainInfo.chainId.type.equals(Chain.Ethereum)) {
        wallet = new EthereumChainWallet(chainInfo, phrase)
      } else if (chainInfo.chainId.type.equals(Chain.Ton)) {
        wallet = new TonChainWallet(chainInfo, phrase)
      }
  
      if (!wallet) {
        throw new Error('Unsupported chain')
      }
      if (RUNTIME_ENV === RuntimeEnv.SDK) {
        rpcManager.resolveConnect({ 
          user: auth,
          address: (await wallet.getAccount()).address
        })
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
