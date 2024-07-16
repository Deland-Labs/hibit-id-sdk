import { RPC } from '@mixer/postmessage-rpc';
import { RPC_SERVICE_NAME } from './constants';
import { HibitIdController, HibitIdIframe } from './dom';
import { ChainInfo, ConnectResponse, GetBalanceRequest, GetBalanceResponse, HibitEnv, HibitIdPage, SignMessageResponse, TransferRequest, TransferResponse, UserAuthInfo, WalletAccount } from './types';
import { ClientExposeRPCMethod, HibitIdExposeRPCMethod } from './enums';

const HIBIT_ID_STORAGE_KEY = 'hibitid_auth'

export class HibitIdWallet {
  private _env: HibitEnv = 'prod'
  private _connected = false
  private _rpc: RPC | null = null
  private _controller: HibitIdController | null = null
  private _iframe: HibitIdIframe | null = null

  constructor(env: HibitEnv) {
    this._env = env
    const authString = sessionStorage.getItem(HIBIT_ID_STORAGE_KEY)
    if (authString) {
      try {
        const auth = JSON.parse(authString) as UserAuthInfo
        this.prepareIframe(auth, 'main').then(() => {
          this._connected = true
          this._controller = new HibitIdController(this._iframe!.toggle)
        })
      } catch (e) {
        console.error('Failed to parse auth info from storage', e)
        sessionStorage.removeItem(HIBIT_ID_STORAGE_KEY)
      }
    }
  }

  get isConnected() {
    return this._connected
  }

  public connect = async () => {
    if (this._connected) {
      return await this.getAccount()
    }

    try {
      await this.prepareIframe(undefined, 'login')
      this._iframe!.show()
      const res = await this._rpc!.call<ConnectResponse>(HibitIdExposeRPCMethod.CONNECT, {})
      if (!res) {
        throw new Error('No response from wallet')
      }
      this._iframe!.hide()
      this._connected = true
      this._controller = new HibitIdController(this._iframe!.toggle)
      console.log('[hibit id connected]')
      sessionStorage.setItem(HIBIT_ID_STORAGE_KEY, JSON.stringify(res.user))
      console.log('[hibit id auth stored]')

      return {
        address: res.address,
        publicKey: res.publicKey,
      }
    } catch (e) {
      throw new Error(`Connect failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  public getAccount = async () => {
    return await this._rpc?.call<WalletAccount>(HibitIdExposeRPCMethod.GET_ACCOUNT, {})
  }

  public getChainInfo = async () => {
    const info = await this._rpc?.call<any>(HibitIdExposeRPCMethod.GET_CHAIN_INFO, {})
    return {
      chainId: {
        type: info.chainId.type.value.toNumber(),
        network: info.chainId.network.value.toNumber()
      },
      name: info.name,
      fullName: info.fullName,
      nativeAssetSymbol: info.nativeAssetSymbol,
      nativeAssetDecimals: info.nativeAssetDecimals,
      explorer: info.explorer,
      rpcUrls: info.rpcUrls,
    } as ChainInfo
  }

  public signMessage = async (message: string) => {
    try {
      await this.prepareIframe()
      const res = await this._rpc?.call<SignMessageResponse>(HibitIdExposeRPCMethod.SIGN_MESSAGE, {
        message,
      })
      return res?.signature ?? null
    } catch (e) {
      throw new Error(`Sign message failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  public getBalance = async (option?: GetBalanceRequest) => {
    const request: GetBalanceRequest = option || {}
    try {
      await this.prepareIframe()
      const res = await this._rpc?.call<GetBalanceResponse>(HibitIdExposeRPCMethod.GET_BALANCE, request)
      return res?.balance ?? null
    } catch (e) {
      throw new Error(`Get balance failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  public transfer = async (option: TransferRequest) => {
    try {
      await this.prepareIframe()
      const res = await this._rpc?.call<TransferResponse>(HibitIdExposeRPCMethod.TRANSFER, option)
      return res?.txHash ?? null
    } catch (e) {
      throw new Error(`Transfer failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  public disconnect = async () => {
    await this._rpc?.call(HibitIdExposeRPCMethod.DISCONNECT, {})
    this._rpc?.destroy()
    this._rpc = null
    this._iframe?.destroy()
    this._controller?.destroy()
    this._connected = false
  }

  private prepareIframe = async (auth?: UserAuthInfo, page?: HibitIdPage) => {
    if (this._rpc && this._iframe) {
      await this._rpc.isReady
      return
    }

    this._iframe = new HibitIdIframe(this._env, auth, page)
    const rpc = new RPC({
      // The window you want to talk to:
      target: this._iframe.iframe.contentWindow!,
      // This should be unique for each of your producer<->consumer pairs:
      serviceId: RPC_SERVICE_NAME,
      // Optionally, allowlist the origin you want to talk to:
      // origin: 'example.com',
    });
    rpc.expose(ClientExposeRPCMethod.CLOSE, this.onRpcClose);
    console.log('[sdk rpc init]')
    await rpc.isReady
    console.log('[sdk rpc ready]')
    this._rpc = rpc
  }

  private onRpcClose = () => {
    this._iframe?.hide()
    this._controller?.setOpen(false)
  }
}
