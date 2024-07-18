import { RPC } from '@mixer/postmessage-rpc';
import { RPC_SERVICE_NAME } from './constants';
import { HibitIdController, HibitIdIframe } from './dom';
import { AccountsChangedRequest, ChainChangedRequest, ChainInfo, ConnectResponse, GetBalanceRequest, GetBalanceResponse, HibitEnv, HibitIdEventHandlerMap, HibitIdPage, SignMessageResponse, TransferRequest, TransferResponse, UserAuthInfo, WalletAccount } from './types';
import { ClientExposeRPCMethod, HibitIdExposeRPCMethod } from './enums';

const HIBIT_ID_STORAGE_KEY = 'hibitid_auth'

export class HibitIdWallet {
  private _env: HibitEnv = 'prod'
  private _connected = false
  private _rpc: RPC | null = null
  private _controller: HibitIdController | null = null
  private _iframe: HibitIdIframe | null = null
  private _eventHandlers: {
    accountsChanged: Array<HibitIdEventHandlerMap['accountsChanged']>
    chainChanged: Array<HibitIdEventHandlerMap['chainChanged']>
  } = {
    accountsChanged: [],
    chainChanged: [],
  }

  constructor(env: HibitEnv) {
    this._env = env
    const authString = sessionStorage.getItem(HIBIT_ID_STORAGE_KEY)
    if (authString) {
      try {
        const auth = JSON.parse(authString) as UserAuthInfo
        this.prepareIframe(auth, 'main').then(() => {
          this._connected = true
          this._controller = new HibitIdController(this.toggleIframe)
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
      this._iframe!.show({ fullscreen: true, style: {} })
      const res = await this._rpc!.call<ConnectResponse>(HibitIdExposeRPCMethod.CONNECT, {})
      if (!res) {
        throw new Error('No response from wallet')
      }
      this._iframe!.hide()
      this._connected = true
      this._controller = new HibitIdController(this.toggleIframe)
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
    sessionStorage.removeItem(HIBIT_ID_STORAGE_KEY)
    await this._rpc?.call(HibitIdExposeRPCMethod.DISCONNECT, {})
    this._rpc?.destroy()
    this._rpc = null
    this._iframe?.destroy()
    this._controller?.destroy()
    this._connected = false
  }

  public addEventListener = <K extends keyof HibitIdEventHandlerMap>(event: K, handler: HibitIdEventHandlerMap[K]) => {
    // @ts-expect-error ts not support this check yet
    this._eventHandlers[event].push(handler)
  }

  public removeEventListener = <K extends keyof HibitIdEventHandlerMap>(event: K, handler: HibitIdEventHandlerMap[K]) => {
    const arr = this._eventHandlers[event]
    // @ts-expect-error ts not support this check yet
    const index = arr.indexOf(handler)
    if (index > -1) {
      arr.splice(index, 1)
    }
  }

  private toggleIframe = () => {
    if (!this._iframe) return
    if (this._iframe.visible) {
      this._iframe.hide()
    } else {
      const controllerRect = this._controller?.getBoundingRect()
      this._iframe.show({
        fullscreen: !this._connected,
        style: {
          maxWidth: '100%',
          maxHeight: '100%',
          width: '332px',
          height: '502px',
          right: `${controllerRect ? (window.innerWidth - controllerRect.right) : 50}px`,
          bottom: `${controllerRect ? (window.innerHeight - controllerRect.top + 20) : 50}px`,
        }
      })
    }
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
    rpc.expose(ClientExposeRPCMethod.CHAIN_CHANGED, this.onRpcChainChanged);
    rpc.expose(ClientExposeRPCMethod.ACCOUNTS_CHANGED, this.onRpcAccountsChanged);

    console.log('[sdk rpc init]')
    await rpc.isReady
    console.log('[sdk rpc ready]')
    this._rpc = rpc
  }

  private onRpcClose = () => {
    this._iframe?.hide()
    this._controller?.setOpen(false)
  }

  private onRpcChainChanged = (input: ChainChangedRequest) => {
    this._eventHandlers.chainChanged.forEach((handler) => {
      handler(input.chainId)
    })
  }

  private onRpcAccountsChanged = (input: AccountsChangedRequest) => {
    this._eventHandlers.accountsChanged.forEach((handler) => {
      handler(input.account)
    })
  }
}
