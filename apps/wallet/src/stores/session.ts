import { makeAutoObservable, reaction } from "mobx";
import { ChainWallet } from "../utils/chain/chain-wallets/types";
import { Chain, ChainId, ChainInfo } from "../utils/basicTypes";
import { Ethereum, EthereumSepolia, Ton, TonTestnet } from "../utils/chain/chain-list";
import { EthereumChainWallet } from "../utils/chain/chain-wallets/ethereum";
import { RUNTIME_ENV } from "../utils/runtime";
import { HibitEnv, RuntimeEnv } from "../utils/basicEnums";
import rpcManager from "./rpc";
import { WalletAccount } from "@deland-labs/hibit-id-sdk";
import { TonChainWallet } from "../utils/chain/chain-wallets/ton";
import { Oidc } from "../utils/oidc/lib/oidc-spa-4.11.1/src/oidc";
import { GetMnemonicAsync, UpdateMnemonicAsync } from "../apis/services/auth";
import { HibitIDError, HibitIDErrorCode } from "../utils/error-code";
import { GetMnemonicInput, GetMnemonicResult, UpdateMnemonicInput } from "../apis/models";
import { AES, enc, MD5 } from "crypto-js";
import { HIBIT_ENV } from "../utils/env";
import { getChainByChainId } from "../utils/chain";

const SESSION_CONFIG_KEY = 'hibitIdSessionConfig'

interface SessionConfig {
  lastChainId: string
}

export class HibitIdSession {
  public wallet: ChainWallet | null = null
  public auth: Oidc.Tokens | null = null
  public chainInfo: ChainInfo

  private _publicKey: string | null = null
  private _mnemonic: GetMnemonicResult | null = null
  private _password: string | null = null
  private _account: WalletAccount | null = null

  constructor() {
    makeAutoObservable(this)

    let initialChainInfo = RUNTIME_ENV === RuntimeEnv.TELEGRAM_MINI_APP
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

  get isLoggedIn() {
    return !!this.auth
  }

  get isConnected() {
    return !!this.wallet
  }

  get isMnemonicCreated() {
    return !!this._mnemonic?.id
  }

  get userId() {
    return this._mnemonic?.userId || ''
  }

  get address() {
    return this._account?.address || ''
  }

  public setChainInfo = (chainInfo: ChainInfo) => {
    this.chainInfo = chainInfo
  }

  public getValidAddress = async () => {
    if (!this._account) return ''
    return this.chainInfo.caseSensitiveAddress
      ? this._account.address
      : this._account.address.toLowerCase()
  }

  public login = async (auth: Oidc.Tokens) => {
    this.auth = auth

    // TODO: get pubkey for encrypted requests
    // const pubkeyRes = await GetPublicKeyAsync()
    // if (!pubkeyRes?.publicKeyBase64) {
    //   // should go to create password page
    //   throw new HibitIDError(HibitIDErrorCode.PASSWORD_NOT_CREATED)
    // }
    // this._publicKey = pubkeyRes.publicKeyBase64
    this._publicKey = ''
    await this.fetchMnemonic()
    console.log('[session logged in]', this.auth)
  }

  public connect = async (password: string) => {
    this._password = password
    try {
      this.wallet = await this.initWallet(this.chainInfo, password)
      this._account = await this.wallet.getAccount()
      console.log('[session connected]', this._account)
  
      if (RUNTIME_ENV === RuntimeEnv.SDK) {
        rpcManager.resolveConnect(await this.wallet.getAccount())
      }
    } catch (e) {
      if (RUNTIME_ENV === RuntimeEnv.SDK && !(e instanceof HibitIDError && e.code === HibitIDErrorCode.INVALID_PASSWORD)) {
        rpcManager.rejectConnect(e instanceof Error ? e.message : JSON.stringify(e))
      }
      throw e
    }
  }

  public disconnect = () => {
    this.auth = null
    this.wallet = null
    this._account = null
    this._publicKey = null
    this._mnemonic = null
    this._password = null
  }

  public switchChain = async (chain: ChainInfo) => {
    if (this.chainInfo.chainId.equals(chain.chainId)) return
    if (!this._password) {
      throw new HibitIDError(HibitIDErrorCode.WALLET_LOCKED)
    }
    this.wallet = await this.initWallet(chain, this._password)
    const oldAddress = this._account?.address
    this._account = await this.wallet.getAccount()
    this.setChainInfo(chain)
    if (RUNTIME_ENV === RuntimeEnv.SDK) {
      rpcManager.notifyChainChanged(chain)
      if (oldAddress !== this._account.address) {
        rpcManager.notifyAccountsChanged(this._account)
      }
    }
  }

  public fetchMnemonic = async () => {
    if (this._publicKey === null) {
      throw new Error('Not logged in')
    }
    const mnemonicRes = await GetMnemonicAsync(new GetMnemonicInput({
      publicKey: this._publicKey,
    }))
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

  private initWallet = async (chainInfo: ChainInfo, password: string): Promise<ChainWallet> => {
    if (!this._mnemonic?.id || !this._mnemonic?.mnemonicContent) {
      throw new HibitIDError(HibitIDErrorCode.MNEMONIC_NOT_CREATED)
    }
    const phrase = AES.decrypt(this._mnemonic.mnemonicContent, password).toString(enc.Utf8);
    if (!phrase) {
      throw new HibitIDError(HibitIDErrorCode.INVALID_PASSWORD)
    }
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
    localStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify({
      lastChainId: chainInfo.chainId.toString(),
    } as SessionConfig))
    return wallet
  }
}

const hibitIdSession = new HibitIdSession()
export default hibitIdSession
