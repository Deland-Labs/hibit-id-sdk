import { RPC } from '@mixer/postmessage-rpc';
import { RPC_SERVICE_NAME } from './constants';
import { HibitIdController, HibitIdIframe } from './dom';
import { AccountsChangedRequest, BridgePromise, ChainChangedRequest, ChainInfo, ConnectedRequest, GetBalanceRequest, GetBalanceResponse, HibitEnv, HibitIdEventHandlerMap, HibitIdPage, LoginChangedRequest, SignMessageResponse, TransferRequest, TransferResponse, WalletAccount } from './types';
import { ClientExposeRPCMethod, HibitIdChainId, HibitIdExposeRPCMethod } from './enums';
import { clamp } from './utils';

const LOGIN_SESSION_KEY = 'hibit-id-session'

export class HibitIdWallet {
  private _env: HibitEnv = 'prod'
  private _hasSession = false
  private _connected = false
  private _rpc: RPC | null = null
  private _controller: HibitIdController | null = null
  private _iframe: HibitIdIframe | null = null
  private _iframeReadyPromise = new BridgePromise<boolean>()
  private _connectPromise: BridgePromise<WalletAccount> | null = null
  private _eventHandlers: {
    accountsChanged: Array<HibitIdEventHandlerMap['accountsChanged']>
    chainChanged: Array<HibitIdEventHandlerMap['chainChanged']>
  } = {
    accountsChanged: [],
    chainChanged: [],
  }

  constructor(env: HibitEnv) {
    this._env = env

    const sessionString = sessionStorage.getItem(LOGIN_SESSION_KEY)
    if (sessionString) {
      this._hasSession = true
    }
    this.prepareIframe().then(() => {
      if (this._hasSession) {
        this._controller = new HibitIdController(this.toggleIframe, this.handleControllerMove)
      }
    })
  }

  get isConnected() {
    return this._connected
  }

  public connect = async (chainId: HibitIdChainId) => {
    if (this._connected) {
      const currentChain = await this.getChainInfo()
      if (`${currentChain.chainId.type}_${currentChain.chainId.network}` !== chainId) {
        await this.switchToChain(chainId)
      }
      return await this.getAccount()
    }

    try {
      await this.prepareIframe()
      if (this._hasSession) {
        this.showIframe()
      }
      console.debug('[sdk call Connect]', { chainId })
      this._connectPromise = new BridgePromise<WalletAccount>()
      this._rpc!.call(HibitIdExposeRPCMethod.CONNECT, {
        chainId,
      })
      const res = await this._connectPromise?.promise
      this._iframe!.hide()
      this._controller?.setOpen(false)
      this._connected = true
      console.debug('[sdk connected]')

      return {
        address: res.address,
        publicKey: res.publicKey,
      }
    } catch (e) {
      throw new Error(`Connect failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  public getAccount = async () => {
    await this.prepareIframe()
    console.debug('[sdk call GetAccount]')
    return await this._rpc?.call<WalletAccount>(HibitIdExposeRPCMethod.GET_ACCOUNT, {})
  }

  public getChainInfo = async () => {
    await this.prepareIframe()
    console.debug('[sdk call GetChainInfo]')
    const info = await this._rpc?.call<any>(HibitIdExposeRPCMethod.GET_CHAIN_INFO, {})
    return {
      chainId: {
        type: Number(info.chainId.type.value),
        network: Number(info.chainId.network.value)
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
      console.debug('[sdk call SignMessage]', { message })
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
      console.debug('[sdk call GetBalance]', { request })
      const res = await this._rpc?.call<GetBalanceResponse>(HibitIdExposeRPCMethod.GET_BALANCE, request)
      return res?.balance ?? null
    } catch (e) {
      throw new Error(`Get balance failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  public transfer = async (option: TransferRequest) => {
    try {
      await this.prepareIframe()
      console.debug('[sdk call Transfer]', { option })
      const res = await this._rpc?.call<TransferResponse>(HibitIdExposeRPCMethod.TRANSFER, option)
      return res?.txHash ?? null
    } catch (e) {
      throw new Error(`Transfer failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  public disconnect = async () => {
    console.debug('[sdk call Disconnect]')
    await this._rpc?.call(HibitIdExposeRPCMethod.DISCONNECT, {})
    this._rpc?.destroy()
    this._rpc = null
    this._iframe?.destroy()
    this._controller?.destroy()
    this._connected = false
    this._iframeReadyPromise = new BridgePromise<boolean>()
    sessionStorage.removeItem(LOGIN_SESSION_KEY)
  }

  public switchToChain = async (chainId: HibitIdChainId) => {
    const currentChain = await this.getChainInfo()
    const currentChainId = `${currentChain.chainId.type}_${currentChain.chainId.network}`
    if (currentChainId === chainId) return

    console.debug('[sdk call SwitchToChain]', { chainId })
    await this._rpc?.call(HibitIdExposeRPCMethod.SWITCH_CHAIN, { chainId })
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
      this.showIframe()
    }
  }

  private prepareIframe = async (page?: HibitIdPage) => {
    if (this._rpc && this._iframe) {
      await this._rpc.isReady
      return
    }

    this._iframe = new HibitIdIframe(this._env, page)
    
    const rpc = new RPC({
      // The window you want to talk to:
      target: this._iframe.iframe.contentWindow!,
      // This should be unique for each of your producer<->consumer pairs:
      serviceId: RPC_SERVICE_NAME,
      // Optionally, allowlist the origin you want to talk to:
      // origin: 'example.com',
    });
    rpc.expose(ClientExposeRPCMethod.CLOSE, this.onRpcClose);
    rpc.expose(ClientExposeRPCMethod.CONNECTED, this.onRpcConnected);
    rpc.expose(ClientExposeRPCMethod.IFRAME_READY, this.onRpcIframeReady);
    rpc.expose(ClientExposeRPCMethod.LOGIN_CHANGED, this.onRpcLoginChanged);
    rpc.expose(ClientExposeRPCMethod.CHAIN_CHANGED, this.onRpcChainChanged);
    rpc.expose(ClientExposeRPCMethod.ACCOUNTS_CHANGED, this.onRpcAccountsChanged);
    
    console.debug('[sdk rpc init]')
    await rpc.isReady
    await this._iframeReadyPromise.promise
    console.debug('[sdk rpc ready]')
    this._rpc = rpc
  }

  private handleControllerMove = (x: number, y: number) => {
    if (!this._iframe) return
    const controllerRect = this._controller?.getBoundingRect()
    const maxRight = window.innerWidth - (controllerRect?.width ?? 0)
    const maxBottom = window.innerHeight - (controllerRect?.height ?? 0)
    const right = clamp(0, controllerRect ? (window.innerWidth - controllerRect.right) : 50, maxRight)
    const bottom = clamp(0, controllerRect ? (window.innerHeight - controllerRect.top + 20) : 50, maxBottom)
    this._iframe.updateStyle({
      // width: '332px',
      // height: '502px',
      right: `${right}px`,
      bottom: `${bottom}px`
    })
  }

  private showIframe = (fullscreen?: boolean) => {
    if (!this._iframe) return
    if (fullscreen) {
      this._iframe.show({ fullscreen: true, style: {} })
    } else {
      const controllerRect = this._controller?.getBoundingRect()
      this._iframe.show({
        fullscreen: false,
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
  
  private onRpcClose = () => {
    console.debug('[sdk on Close]')
    this._iframe?.hide()
    this._controller?.setOpen(false)
  }

  private onRpcLoginChanged = (input: LoginChangedRequest) => {
    console.debug('[sdk on LoginChanged]', { input })
    if (!input.isLogin) {
      this.showIframe(true)
    } else {
      if (!this._controller) {
        this._controller = new HibitIdController(this.toggleIframe, this.handleControllerMove)
      }
      if (this._hasSession) {
        return
      }
      this.showIframe()
      this._controller?.setOpen(true)
      sessionStorage.setItem(LOGIN_SESSION_KEY, input.sub || '')
    }
  }

  private onRpcChainChanged = (input: ChainChangedRequest) => {
    console.debug('[sdk on ChainChanged]', { input })
    this._eventHandlers.chainChanged.forEach((handler) => {
      handler(input.chainId)
    })
  }

  private onRpcAccountsChanged = (input: AccountsChangedRequest) => {
    console.debug('[sdk on AccountsChanged]', { input })
    this._eventHandlers.accountsChanged.forEach((handler) => {
      handler(input.account)
    })
  }

  private onRpcIframeReady = () => {
    console.debug('[sdk on IframeReady]')
    this._iframeReadyPromise.resolve(true)
  }

  private onRpcConnected = (input: ConnectedRequest) => {
    console.debug('[sdk on Connected]')
    this._connectPromise?.resolve(input)
  }
}
