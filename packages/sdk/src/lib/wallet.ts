import { RPC } from '@mixer/postmessage-rpc';
import { RPC_SERVICE_NAME } from './constants';
import { HibitIdController, HibitIdIframe } from './dom';
import { AccountsChangedRequest, BridgePromise, ChainChangedRequest, ChainInfo, ConnectedRequest, GetAccountRequest, GetAccountResponse, GetBalanceRequest, GetBalanceResponse, GetChainInfoResponse, HibitIdError, HibitIdEventHandlerMap, HibitIdWalletOptions, LoginChangedRequest, SignMessageRequest, SignMessageResponse, TonConnectGetStateInitResponse, TonConnectSignDataRequest, TonConnectSignDataResponse, TonConnectTransferRequest, TonConnectTransferResponse, TransferRequest, TransferResponse, WalletAccount } from './types';
import { ClientExposeRPCMethod, HibitIdChainId, HibitIdErrorCode, HibitIdExposeRPCMethod } from './enums';
import { clamp } from './utils';
import { TonConnectSignDataResult } from './tonconnect/types';

const LOGIN_SESSION_KEY = 'hibit-id-session'

export class HibitIdWallet {
  private _options: HibitIdWalletOptions
  private _hasSession = false
  private _connected = false
  private _rpc: RPC | null = null
  private _controller: HibitIdController | null = null
  private _iframe: HibitIdIframe | null = null
  private _iframeReadyPromise = new BridgePromise<boolean>()
  private _connectPromise: BridgePromise<WalletAccount | null> | null = null
  private _disconnectedPromise: BridgePromise<boolean> | null = null
  private _eventHandlers: {
    accountsChanged: Array<HibitIdEventHandlerMap['accountsChanged']>
    chainChanged: Array<HibitIdEventHandlerMap['chainChanged']>
  } = {
    accountsChanged: [],
    chainChanged: [],
  }

  constructor(options: HibitIdWalletOptions) {
    this._options = options

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
    console.debug('[sdk call Connect]', { chainId })
    await this._iframeReadyPromise.promise
    
    if (this._connected) {
      const currentChain = await this.getChainInfo()
      if (`${currentChain.chainId.type}_${currentChain.chainId.network}` !== chainId) {
        await this.switchToChain(chainId)
      }
      return await this.getAccount()
    }

    try {
      this.showIframe(!this._hasSession)
      this._connectPromise = new BridgePromise<WalletAccount | null>()
      this._rpc!.call(HibitIdExposeRPCMethod.CONNECT, {
        chainId,
      })
      const res = await this._connectPromise?.promise
      this._iframe!.hide()
      this._controller?.setOpen(false)
      if (res?.address) {
        this._connected = true
        console.debug('[sdk connected]')
  
        return {
          address: res.address,
          publicKey: res.publicKey,
        }
      }
      throw new HibitIdError(HibitIdErrorCode.USER_CANCEL_CONNECTION, 'User manually canceled')
    } catch (e: any) {
      throw new Error(`Connect failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public getAccount = async (chainId?: HibitIdChainId): Promise<WalletAccount> => {
    console.debug('[sdk call GetAccount]')
    await this._iframeReadyPromise.promise
    this.assertConnected()
    try {
      const res = await this._rpc?.call<GetAccountResponse>(HibitIdExposeRPCMethod.GET_ACCOUNT, {
        chainId,
      } as GetAccountRequest)
      if (!res?.success) {
        throw new Error(res?.errMsg)
      }
      return res.data
    } catch (e: any) {
      throw new Error(`Get account failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public getChainInfo = async (): Promise<ChainInfo> => {
    console.debug('[sdk call GetChainInfo]')
    await this._iframeReadyPromise.promise
    this.assertConnected()
    try {
      const res = await this._rpc?.call<GetChainInfoResponse>(HibitIdExposeRPCMethod.GET_CHAIN_INFO, {})
      if (!res?.success) {
        throw new Error(res?.errMsg)
      }
      return res.data.chainInfo
    } catch (e: any) {
      throw new Error(`Get chainInfo failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public signMessage = async (message: string, chainId?: HibitIdChainId): Promise<string> => {
    console.debug('[sdk call SignMessage]', { message })
    await this._iframeReadyPromise.promise
    this.assertConnected()
    try {
      const res = await this._rpc?.call<SignMessageResponse>(HibitIdExposeRPCMethod.SIGN_MESSAGE, {
        message,
        chainId
      } as SignMessageRequest)
      if (!res?.success) {
        throw new Error(res?.errMsg)
      }
      return res.data.signature ?? null
    } catch (e: any) {
      throw new Error(`Sign message failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public getBalance = async (option?: GetBalanceRequest): Promise<string> => {
    const request: GetBalanceRequest = option || {}
    console.debug('[sdk call GetBalance]', { request })
    await this._iframeReadyPromise.promise
    this.assertConnected()
    try {
      const res = await this._rpc?.call<GetBalanceResponse>(HibitIdExposeRPCMethod.GET_BALANCE, request)
      if (!res?.success) {
        throw new Error(res?.errMsg)
      }
      return res.data.balance ?? null
    } catch (e: any) {
      throw new Error(`Get balance failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public transfer = async (option: TransferRequest): Promise<string> => {
    console.debug('[sdk call Transfer]', { option })
    await this._iframeReadyPromise.promise
    this.assertConnected()
    try {
      const res = await this._rpc?.call<TransferResponse>(HibitIdExposeRPCMethod.TRANSFER, option)
      if (!res?.success) {
        throw new Error(res?.errMsg)
      }
      return res.data.txHash ?? null
    } catch (e: any) {
      console.error(e, JSON.stringify(e))
      throw new Error(`Transfer failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public tonConnectGetStateInit = async (): Promise<string> => {
    console.debug('[sdk call TonConnectGetStateInit]')
    await this._iframeReadyPromise.promise
    this.assertConnected()
    try {
      const res = await this._rpc?.call<TonConnectGetStateInitResponse>(HibitIdExposeRPCMethod.TONCONNECT_GET_STATE_INIT, {})
      if (!res?.success) {
        throw new Error(res?.errMsg)
      }
      return res.data.stateInitBase64 ?? null
    } catch (e: any) {
      console.error(e, JSON.stringify(e))
      throw new Error(`TonConnectGetStateInit failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public tonConnectTransfer = async (payload: TonConnectTransferRequest): Promise<string> => {
    console.debug('[sdk call TonConnectTransfer]', { option: payload })
    await this._iframeReadyPromise.promise
    this.assertConnected()
    try {
      const res = await this._rpc?.call<TonConnectTransferResponse>(HibitIdExposeRPCMethod.TONCONNECT_TRANSFER, payload)
      if (!res?.success) {
        throw new Error(res?.errMsg)
      }
      return res.data.message ?? null
    } catch (e: any) {
      console.error(e, JSON.stringify(e))
      throw new Error(`TonConnectTransfer failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public tonConnectSignData = async (payload: TonConnectSignDataRequest): Promise<TonConnectSignDataResult> => {
    console.debug('[sdk call TonConnectSignData]', { option: payload })
    await this._iframeReadyPromise.promise
    this.assertConnected()
    try {
      const res = await this._rpc?.call<TonConnectSignDataResponse>(HibitIdExposeRPCMethod.TONCONNECT_SIGN_DATA, payload)
      if (!res?.success) {
        throw new Error(res?.errMsg)
      }
      return res.data ?? null
    } catch (e: any) {
      console.error(e, JSON.stringify(e))
      throw new Error(`TonConnectSignData failed: ${this.getRpcErrorMessage(e)}`)
    }
  }

  public disconnect = async () => {
    console.debug('[sdk call Disconnect]')
    await this._iframeReadyPromise.promise
    this._connected = false
    // this._disconnectedPromise = new BridgePromise<boolean>()
    // this._rpc?.call(HibitIdExposeRPCMethod.DISCONNECT, {})
    // await this._disconnectedPromise.promise
    // this.dispose()
  }

  public dispose = async () => {
    console.debug('[sdk call Dispose]')
    sessionStorage.removeItem(LOGIN_SESSION_KEY)
    this._controller?.destroy()
    this._controller = null
    this._connected = false
    this._iframeReadyPromise = new BridgePromise<boolean>()
    this._connectPromise = null
    this._disconnectedPromise = null
    this._rpc?.destroy()
    this._rpc = null
    this._iframe?.destroy()
    this._iframe = null
  }

  public switchToChain = async (chainId: HibitIdChainId) => {
    console.debug('[sdk call SwitchToChain]', { chainId })
    await this._iframeReadyPromise.promise
    this.assertConnected()
    const currentChain = await this.getChainInfo()
    const currentChainId = `${currentChain.chainId.type}_${currentChain.chainId.network}`
    if (currentChainId === chainId) return

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

  private assertConnected = () => {
    if (!this._connected) {
      throw new HibitIdError(HibitIdErrorCode.WALLET_NOT_CONNECTED, 'Wallet is not connected')
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

  private prepareIframe = async () => {
    if (this._rpc && this._iframe) {
      await this._rpc.isReady
      return
    }

    this._iframe = new HibitIdIframe(
      this._options.env,
      this._options.chains,
      this._options.iframeUrlAppendix,
      this._options.lang,
    )
    
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
    rpc.expose(ClientExposeRPCMethod.DISCONNECTED, this.onRpcDisconnected);
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
    if (!this._iframe || !this._iframe.isDesktop) return
    const controllerRect = this._controller?.getBoundingRect()
    const maxRight = window.innerWidth - (controllerRect?.width ?? 0)
    const maxBottom = window.innerHeight - (controllerRect?.height ?? 0)
    const right = clamp(0, controllerRect ? (window.innerWidth - controllerRect.right) : 50, maxRight)
    const bottom = clamp(0, controllerRect ? (window.innerHeight - controllerRect.top + 20) : 50, maxBottom)
    this._iframe.updateStyle({
      right: `${right}px`,
      bottom: `${bottom}px`
    })
  }

  private showIframe = (fullscreen?: boolean) => {
    if (!this._iframe) return
    if (fullscreen) {
      this._iframe.show(true)
    } else {
      const controllerRect = this._controller?.getBoundingRect()
      this._iframe.show(false, controllerRect ? {
        right: window.innerWidth - controllerRect.right,
        bottom: window.innerHeight - controllerRect.top + 20,
      } : undefined)
    }
  }
  
  private onRpcClose = () => {
    console.debug('[sdk on Close]')
    this._iframe?.hide()
    this._controller?.setOpen(false)
  }

  private onRpcLoginChanged = (input: LoginChangedRequest) => {
    console.debug('[sdk on LoginChanged]', { input })
    // only show iframe during connection
    this._hasSession = input.isLogin
    if (!input.isLogin) {
      sessionStorage.removeItem(LOGIN_SESSION_KEY)
      if (this._connectPromise) {
        this.showIframe(true)
      }
    } else {
      sessionStorage.setItem(LOGIN_SESSION_KEY, input.sub || '')
      if (!this._controller) {
        this._controller = new HibitIdController(this.toggleIframe, this.handleControllerMove)
      }
      if (this._connectPromise) {
        this.showIframe()
        this._controller?.setOpen(true)
      }
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

  private onRpcConnected = (input: ConnectedRequest | null) => {
    console.debug('[sdk on Connected]')
    if (input) {
      this._connected = true
    }
    this._connectPromise?.resolve(input)
    this._connectPromise = null
  }

  private onRpcDisconnected = () => {
    console.debug('[sdk on Disconnected]')
    this._connected = false
    this._disconnectedPromise?.resolve(true)
    this._disconnectedPromise = null
  }

  private getRpcErrorMessage = (e: any) => {
    return (e.message as string)?.split('\n')[0].replace('Error: ', '') || String(e)
  }
}
