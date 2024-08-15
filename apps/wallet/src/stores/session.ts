import { makeAutoObservable, reaction } from "mobx";
import { ChainWalletPool } from "../utils/chain/chain-wallets";
import { ChainId, ChainInfo } from "../utils/basicTypes";
import { Ethereum, EthereumSepolia, Ton, TonTestnet } from "../utils/chain/chain-list";
import { IS_TELEGRAM_MINI_APP, RUNTIME_ENV } from "../utils/runtime";
import { HibitEnv, RuntimeEnv } from "../utils/basicEnums";
import rpcManager from "./rpc";
import { WalletAccount } from "@deland-labs/hibit-id-sdk";
import { Oidc } from '../utils/oidc/lib/oidc-spa-4.11.1/src';
import { MnemonicManager, UpdateMnemonicAsync } from '../apis/services/auth';
import { HibitIDError, HibitIDErrorCode } from "../utils/error-code";
import { GetMnemonicResult, UpdateMnemonicInput } from "../apis/models";
import { AES, enc, MD5 } from "crypto-js";
import { HIBIT_ENV } from "../utils/env";
import { getChainByChainId } from "../utils/chain";

const SESSION_CONFIG_KEY = 'hibit-id-config'
const PASSWORD_STORAGE_KEY = 'hibit-id-p'

interface SessionConfig {
  lastChainId: string
}

export class HibitIdSession {
  public walletPool: ChainWalletPool | null = null
  public auth: Oidc.Tokens | null = null
  public chainInfo: ChainInfo

  private _mnemonic: GetMnemonicResult | null = null
  private _password: string | null = null
  private _account: WalletAccount | null = null

  constructor() {
    makeAutoObservable(this)
    console.debug('[wallet session constructor called]')

    let initialChainInfo = IS_TELEGRAM_MINI_APP
      ? HIBIT_ENV === HibitEnv.PROD ? Ton : TonTestnet
      : HIBIT_ENV === HibitEnv.PROD ? Ethereum : EthereumSepolia
    const config = localStorage.getItem(SESSION_CONFIG_KEY)
    if (config) {
      const { lastChainId } = JSON.parse(config) as SessionConfig
      const chainId = ChainId.fromString(lastChainId)
      const chainInfo = getChainByChainId(chainId)
      if (chainInfo) {
        initialChainInfo = chainInfo
      }
    }
    this.chainInfo = initialChainInfo

    if (RUNTIME_ENV === RuntimeEnv.SDK) {
      reaction(
        () => this.chainInfo,
        (chainInfo) => {
          if (chainInfo) {
            rpcManager.setChainInfo(chainInfo)
          }
        },
        { fireImmediately: true }
      )
      reaction(
        () => this.walletPool,
        (walletPool) => {
          if (walletPool) {
            rpcManager.setWalletPool(walletPool)
          }
        }
      )
    }
  }

  get isLoggedIn() {
    return !!this.auth
  }

  get isUnlocked() {
    return !!this.walletPool
  }

  get isMnemonicCreated() {
    return !!this._mnemonic?.id
  }

  get userId() {
    return this._mnemonic?.userId || ''
  }

  get account() {
    return this._account
  }

  public setChainInfo = (chainInfo: ChainInfo) => {
    this.chainInfo = chainInfo
    localStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify({
      lastChainId: chainInfo.chainId.toString(),
    } as SessionConfig))
  }

  public getValidAddress = async () => {
    if (!this._account) return ''
    return this.chainInfo.caseSensitiveAddress
      ? this._account.address
      : this._account.address.toLowerCase()
  }

  public login = async (auth: Oidc.Tokens) => {
    this.auth = auth
    await this.fetchMnemonic()
    console.log('[session logged in]', this.auth)
    if (this.isMnemonicCreated) {
      const storedPassword = sessionStorage.getItem(PASSWORD_STORAGE_KEY)
      if (storedPassword) {
        await this.unlock(storedPassword)
      }
    }
  }

  public unlock = async (password: string) => {
    this._password = password
    try {
      this.walletPool = this.initWalletPool(password)
      this._account = await this.walletPool.getAccount(this.chainInfo.chainId)
      sessionStorage.setItem(PASSWORD_STORAGE_KEY, password)
      console.log('[session unlocked]', this._account)
  
      if (RUNTIME_ENV === RuntimeEnv.SDK) {
        rpcManager.notifyConnected(this._account)
      }
    } catch (e) {
      if (RUNTIME_ENV === RuntimeEnv.SDK && !(e instanceof HibitIDError && e.code === HibitIDErrorCode.INVALID_PASSWORD)) {
        rpcManager.notifyConnected(null)
      }
      throw e
    }
  }

  public disconnect = async () => {
    this.auth = null
    this.walletPool = null
    this._account = null
    this._mnemonic = null
    this._password = null
    sessionStorage.removeItem(PASSWORD_STORAGE_KEY)
  }

  public switchChain = async (chain: ChainInfo) => {
    if (this.chainInfo.chainId.equals(chain.chainId)) return
    if (!this.walletPool) {
      throw new HibitIDError(HibitIDErrorCode.WALLET_LOCKED)
    }
    this.setChainInfo(chain)
    const oldAddress = this._account?.address
    this._account = await this.walletPool.getAccount(chain.chainId)
    if (RUNTIME_ENV === RuntimeEnv.SDK) {
      rpcManager.notifyChainChanged(chain)
      if (oldAddress !== this._account.address) {
        rpcManager.notifyAccountsChanged(this._account)
      }
    }
  }

  public fetchMnemonic = async () => {
    const mnemonicRes = await MnemonicManager.instance.getAsync();
    this._mnemonic = mnemonicRes
  }

  public updatePassword = async (oldPasswordRaw: string, newPasswordRaw: string) => {
    if (!this._mnemonic?.mnemonicContent) {
      throw new HibitIDError(HibitIDErrorCode.MNEMONIC_NOT_CREATED)
    }
    if (!this._password) {
      throw new HibitIDError(HibitIDErrorCode.WALLET_LOCKED)
    }
    const oldPwd = MD5(`${oldPasswordRaw}${this.userId}`).toString()
    if (oldPwd !== this._password) {
      throw new HibitIDError(HibitIDErrorCode.INVALID_PASSWORD)
    }
    const newPwd = MD5(`${newPasswordRaw}${this.userId}`).toString()
    const phrase = AES.decrypt(this._mnemonic.mnemonicContent, oldPwd).toString(enc.Utf8);
    const encryptedContent = AES.encrypt(phrase, newPwd).toString()
    await UpdateMnemonicAsync(new UpdateMnemonicInput({
      aesKey: '',  // TODO:
      oldMnemonicContent: this._mnemonic.mnemonicContent,
      oldVersion: 0,  // TODO:
      newMnemonicContent: encryptedContent,
      newVersion: 0,  // TODO:
    }))
    await this.fetchMnemonic()
    this._password = newPwd
  }

  private initWalletPool = (password: string): ChainWalletPool => {
    if (!this._mnemonic?.id || !this._mnemonic?.mnemonicContent) {
      throw new HibitIDError(HibitIDErrorCode.MNEMONIC_NOT_CREATED)
    }
    const phrase = AES.decrypt(this._mnemonic.mnemonicContent, password).toString(enc.Utf8);
    if (!phrase) {
      throw new HibitIDError(HibitIDErrorCode.INVALID_PASSWORD)
    }
    const pool = new ChainWalletPool(phrase)
    return pool
  }
}

const hibitIdSession = new HibitIdSession()
export default hibitIdSession
