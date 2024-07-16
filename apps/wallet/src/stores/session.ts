import { makeAutoObservable } from "mobx";
import { ChainWallet } from "../utils/chain/chain-wallets/types";
import { Chain, ChainInfo } from "../utils/basicTypes";
import { EthereumSepolia } from "../utils/chain/chain-list";
import { EthereumChainWallet } from "../utils/chain/chain-wallets/ethereum";
import { RUNTIME_ENV } from "../utils/runtime";
import { RuntimeEnv } from "../utils/basicEnums";
import rpcManager from "./rpc";
import { UserAuthInfo } from "../utils/auth/types";
import { WEB_STORAGE_KEY } from "../utils/constants";
import { TonChainWallet } from "../utils/chain/chain-wallets/ton";

export class HibitIdSession {
  public wallet: ChainWallet | null = null
  public auth: UserAuthInfo | null = null
  public chainInfo: ChainInfo

  constructor() {
    makeAutoObservable(this)
    this.chainInfo = EthereumSepolia
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

  public connect = async (auth: UserAuthInfo) => {
    this.auth = auth
    this.wallet = await this.initWallet(auth)
    console.log('[session connected]', this.auth)
    if (RUNTIME_ENV === RuntimeEnv.WEB) {
      sessionStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(this.auth))
    }
  }

  public disconnect = () => {
    this.auth = null
    this.wallet = null
    if (RUNTIME_ENV === RuntimeEnv.WEB) {
      sessionStorage.removeItem(WEB_STORAGE_KEY)
    }
  }

  private initWallet = async (auth: UserAuthInfo): Promise<ChainWallet> => {
    try {
      // TODO: trade userInfo for wallet phrase
      console.log('[query phrase with]', auth)
      const phrase = await Promise.resolve('unaware manage apart embrace gap age alcohol rabbit decrease purchase nerve flee')

      let wallet: ChainWallet | null = null
      // TODO: add more chains
      if (this.chainInfo.chainId.type.equals(Chain.Ethereum)) {
        wallet = new EthereumChainWallet(this.chainInfo, phrase)
      } else if (this.chainInfo.chainId.type.equals(Chain.Ton)) {
        wallet = new TonChainWallet(this.chainInfo, phrase)
      }
  
      if (!wallet) {
        throw new Error('Unsupported chain')
      }
      if (RUNTIME_ENV === RuntimeEnv.SDK) {
        rpcManager.resolveConnect({ 
          user: auth,
          address: wallet.getAddress()
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
