import { RPC } from '@mixer/postmessage-rpc';
import { RPC_SERVICE_NAME } from './constants';
import { HibitIdController, HibitIdIframe } from './dom';
import {
  AccountsChangedRequest,
  BalanceChangeData,
  BridgePromise,
  ChainChangedRequest,
  ChainInfo,
  ConnectedRequest,
  GetAccountRequest,
  GetAccountResponse,
  GetBalanceRequest,
  GetBalanceResponse,
  GetChainInfoResponse,
  GetEstimatedFeeRequest,
  GetEstimatedFeeResponse,
  HibitIdError,
  HibitIdEventHandlerMap,
  HibitIdWalletOptions,
  LoginChangedRequest,
  PasswordChangedRequest,
  SetBackgroundEmbedRequest,
  SignMessageRequest,
  SignMessageResponse,
  TonConnectGetStateInitResponse,
  TonConnectSignDataRequest,
  TonConnectSignDataResponse,
  TonConnectTransferRequest,
  TonConnectTransferResponse,
  TransferRequest,
  TransferResponse,
  VerifyPasswordRequest,
  VerifyPasswordResponse
} from './types';
import {
  SdkExposeRPCMethod,
  HibitIdChainId,
  HibitIdErrorCode,
  WalletExposeRPCMethod,
  AuthenticatorType
} from './enums';
import { clamp, parseBalanceRequest, stringifyBalanceRequest } from './utils';
import { TonConnectSignDataResult } from '@delandlabs/coin-ton';
import { WalletAccount } from '@delandlabs/coin-base/model';
import { logger } from './utils/logger';

const LOGIN_SESSION_KEY = 'hibit-id-session';
const BALANCE_POLL_INTERVAL = 5000;

export class HibitIdWallet {
  private _options: HibitIdWalletOptions;
  private _hasSession = false;
  private _connected = false;
  private _rpc: RPC | null = null;
  private _controller: HibitIdController | null = null;
  private _iframe: HibitIdIframe | null = null;
  private _iframeReadyPromise = new BridgePromise<boolean>();
  private _connectPromise: BridgePromise<WalletAccount | null> | null = null;
  private _disconnectedPromise: BridgePromise<boolean> | null = null;
  private _eventHandlers: {
    accountsChanged: Array<HibitIdEventHandlerMap['accountsChanged']>;
    chainChanged: Array<HibitIdEventHandlerMap['chainChanged']>;
  } = {
    accountsChanged: [],
    chainChanged: []
  };
  private _balanceSubscribes: Record<
    string,
    {
      lastBalance: string | null;
      handlers: Array<(data: BalanceChangeData) => void>;
    }
  > = {};
  private _balancePollIntervalId: any = null;

  constructor(options: HibitIdWalletOptions) {
    this._options = options;

    const sessionString = sessionStorage.getItem(LOGIN_SESSION_KEY);
    if (sessionString) {
      this._hasSession = true;
    }
    this.prepareIframe().then(() => {
      if (this._hasSession && this._options.embedMode !== 'background') {
        this._controller = new HibitIdController(
          this.toggleIframe,
          this.handleControllerMove,
          this._options.controllerDefaultPosition
        );
      }
    });
  }

  get isConnected() {
    return this._connected;
  }

  public connect = async (
    chainId: HibitIdChainId,
    authType?: AuthenticatorType
  ) => {
    logger.debug('[sdk call Connect]', { chainId });
    await this._iframeReadyPromise.promise;

    if (this._connected) {
      const currentChain = await this.getChainInfo();
      if (
        `${currentChain.chainId.type}_${currentChain.chainId.network}` !==
        chainId
      ) {
        await this.switchToChain(chainId);
      }
      return await this.getAccount();
    }

    try {
      this.showIframe(!this._hasSession);
      this._connectPromise = new BridgePromise<WalletAccount | null>();
      this._rpc!.call(WalletExposeRPCMethod.CONNECT, {
        chainId,
        authType
      });
      const res = await this._connectPromise?.promise;
      // this._iframe!.hide()
      // this._controller?.setOpen(false)
      if (res?.address) {
        this._connected = true;
        logger.debug('[sdk connected]');

        return {
          address: res.address,
          publicKey: res.publicKey
        };
      }
      throw new HibitIdError(
        HibitIdErrorCode.USER_CANCEL_CONNECTION,
        'User manually canceled'
      );
    } catch (e: any) {
      throw new Error(`Connect failed: ${this.getRpcErrorMessage(e)}`);
    }
  };

  public getAccount = async (
    chainId?: HibitIdChainId
  ): Promise<WalletAccount> => {
    logger.debug('[sdk call GetAccount]');
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<GetAccountResponse>(
        WalletExposeRPCMethod.GET_ACCOUNT,
        {
          chainId
        } as GetAccountRequest
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data;
    } catch (e: any) {
      throw new Error(`Get account failed: ${this.getRpcErrorMessage(e)}`);
    }
  };

  public getChainInfo = async (): Promise<ChainInfo> => {
    logger.debug('[sdk call GetChainInfo]');
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<GetChainInfoResponse>(
        WalletExposeRPCMethod.GET_CHAIN_INFO,
        {}
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data.chainInfo;
    } catch (e: any) {
      throw new Error(`Get chainInfo failed: ${this.getRpcErrorMessage(e)}`);
    }
  };

  public signMessage = async (
    message: string,
    chainId?: HibitIdChainId
  ): Promise<string> => {
    logger.debug('[sdk call SignMessage]', { message });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<SignMessageResponse>(
        WalletExposeRPCMethod.SIGN_MESSAGE,
        {
          message,
          chainId
        } as SignMessageRequest
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data.signature ?? null;
    } catch (e: any) {
      throw new Error(`Sign message failed: ${this.getRpcErrorMessage(e)}`);
    }
  };

  public getBalance = async (option?: GetBalanceRequest): Promise<string> => {
    const request: GetBalanceRequest = option || {};
    logger.debug('[sdk call GetBalance]', { request });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<GetBalanceResponse>(
        WalletExposeRPCMethod.GET_BALANCE,
        request
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data.balance ?? null;
    } catch (e: any) {
      throw new Error(`Get balance failed: ${this.getRpcErrorMessage(e)}`);
    }
  };

  public transfer = async (option: TransferRequest): Promise<string> => {
    logger.debug('[sdk call Transfer]', { option });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<TransferResponse>(
        WalletExposeRPCMethod.TRANSFER,
        option
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data.txHash ?? null;
    } catch (e: any) {
      logger.error('Operation failed', JSON.stringify(e));
      throw new Error(`Transfer failed: ${this.getRpcErrorMessage(e)}`);
    }
  };

  public getEstimatedFee = async (
    option: GetEstimatedFeeRequest
  ): Promise<string> => {
    const request: GetEstimatedFeeRequest = option || {};
    logger.debug('[sdk call getEstimatedFee]', { request });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<GetEstimatedFeeResponse>(
        WalletExposeRPCMethod.GET_ESTIMATED_FEE,
        request
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data.fee ?? null;
    } catch (e: any) {
      throw new Error(
        `Get estimated fee failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public tonConnectGetStateInit = async (): Promise<string> => {
    logger.debug('[sdk call TonConnectGetStateInit]');
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<TonConnectGetStateInitResponse>(
        WalletExposeRPCMethod.TONCONNECT_GET_STATE_INIT,
        {}
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data.stateInitBase64 ?? null;
    } catch (e: any) {
      logger.error('Operation failed', e);
      throw new Error(
        `TonConnectGetStateInit failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public tonConnectTransfer = async (
    payload: TonConnectTransferRequest
  ): Promise<string> => {
    logger.debug('[sdk call TonConnectTransfer]', { option: payload });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<TonConnectTransferResponse>(
        WalletExposeRPCMethod.TONCONNECT_TRANSFER,
        payload
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data.message ?? null;
    } catch (e: any) {
      logger.error('Operation failed', JSON.stringify(e));
      throw new Error(
        `TonConnectTransfer failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public tonConnectSignData = async (
    payload: TonConnectSignDataRequest
  ): Promise<TonConnectSignDataResult> => {
    logger.debug('[sdk call TonConnectSignData]', { option: payload });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<TonConnectSignDataResponse>(
        WalletExposeRPCMethod.TONCONNECT_SIGN_DATA,
        payload
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return res.data ?? null;
    } catch (e: any) {
      logger.error('Operation failed', JSON.stringify(e));
      throw new Error(
        `TonConnectSignData failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public disconnect = async () => {
    logger.debug('[sdk call Disconnect]');
    await this._iframeReadyPromise.promise;
    this._connected = false;
    // this._disconnectedPromise = new BridgePromise<boolean>()
    await this._rpc?.call(WalletExposeRPCMethod.DISCONNECT, {});
    // await this._disconnectedPromise.promise
    // this.dispose()
  };

  public dispose = async () => {
    logger.debug('[sdk call Dispose]');
    sessionStorage.removeItem(LOGIN_SESSION_KEY);
    this._controller?.destroy();
    this._controller = null;
    this._connected = false;
    this._iframeReadyPromise = new BridgePromise<boolean>();
    this._connectPromise = null;
    this._disconnectedPromise = null;
    this._rpc?.destroy();
    this._rpc = null;
    this._iframe?.destroy();
    this._iframe = null;
  };

  public switchToChain = async (chainId: HibitIdChainId) => {
    logger.debug('[sdk call SwitchToChain]', { chainId });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    const currentChain = await this.getChainInfo();
    const currentChainId = `${currentChain.chainId.type}_${currentChain.chainId.network}`;
    if (currentChainId === chainId) return;

    await this._rpc?.call(WalletExposeRPCMethod.SWITCH_CHAIN, { chainId });
  };

  public setBackgroundEmbed = async (value: boolean) => {
    logger.debug('[sdk call SetBackgroundEmbed]', { value });
    if (value && this._options.embedMode === 'background') return;
    if (!value && this._options.embedMode !== 'background') return;
    await this._iframeReadyPromise.promise;
    await this._rpc?.call(WalletExposeRPCMethod.SET_BACKGROUND_EMBED, {
      value
    } as SetBackgroundEmbedRequest);
    this._options.embedMode = value ? 'background' : 'float';

    const iframeVisible = (value ? false : this._iframe?.visible) ?? false;
    // update controller and reposition iframe
    if (!value) {
      this._controller = new HibitIdController(
        this.toggleIframe,
        this.handleControllerMove,
        this._options.controllerDefaultPosition
      );
    } else {
      this._controller?.destroy();
      this._controller = null;
    }
    this.showIframe();
    if (!iframeVisible) {
      this._iframe?.hide();
    }
  };

  public showResetPassword = async () => {
    logger.debug('[sdk call showResetPassword]');
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    await this._rpc?.call(WalletExposeRPCMethod.SHOW_RESET_PASSWORD, {});
    this.showIframe();
  };

  public verifyPassword = async (
    option: VerifyPasswordRequest
  ): Promise<boolean> => {
    const request: VerifyPasswordRequest = option || {};
    logger.debug('[sdk call verifyPassword]');
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<VerifyPasswordResponse>(
        WalletExposeRPCMethod.VERIFY_PASSWORD,
        request
      );
      if (!res?.success) {
        throw new Error(res?.errMsg);
      }
      return true;
    } catch (e: any) {
      throw new Error(`Verify password failed: ${this.getRpcErrorMessage(e)}`);
    }
  };

  public addEventListener = <K extends keyof HibitIdEventHandlerMap>(
    event: K,
    handler: HibitIdEventHandlerMap[K]
  ) => {
    // @ts-expect-error ts not support this check yet
    this._eventHandlers[event].push(handler);
  };

  public removeEventListener = <K extends keyof HibitIdEventHandlerMap>(
    event: K,
    handler: HibitIdEventHandlerMap[K]
  ) => {
    const arr = this._eventHandlers[event];
    // @ts-expect-error ts not support this check yet
    const index = arr.indexOf(handler);
    if (index > -1) {
      arr.splice(index, 1);
    }
  };

  public subscribeBalanceChange = (
    request: GetBalanceRequest,
    handler: (data: BalanceChangeData) => void
  ) => {
    const id = stringifyBalanceRequest(request);
    if (!this._balanceSubscribes[id]) {
      this._balanceSubscribes[id] = {
        lastBalance: null,
        handlers: [handler]
      };
    } else {
      this._balanceSubscribes[id].handlers.push(handler);
    }
    if (!this._balancePollIntervalId) {
      this._balancePollIntervalId = setInterval(
        this.doBalancePoll,
        BALANCE_POLL_INTERVAL
      );
    }
  };

  public unsubscribeBalanceChange = (
    request: GetBalanceRequest,
    handler: (data: BalanceChangeData) => void
  ) => {
    const id = stringifyBalanceRequest(request);
    if (!this._balanceSubscribes[id]) return;
    const index = this._balanceSubscribes[id].handlers.indexOf(handler);
    if (index > -1) {
      this._balanceSubscribes[id].handlers.splice(index, 1);
    }
    if (this._balanceSubscribes[id].handlers.length === 0) {
      delete this._balanceSubscribes[id];
    }
    if (Object.keys(this._balanceSubscribes).length === 0) {
      clearInterval(this._balancePollIntervalId);
      this._balancePollIntervalId = null;
    }
  };

  private doBalancePoll = async () => {
    if (!this._connected) return;
    await this._iframeReadyPromise.promise;
    const requestPromises = Object.keys(this._balanceSubscribes).map((key) => {
      const request = parseBalanceRequest(key);
      return this.getBalance(request);
    });
    const results = await Promise.allSettled(requestPromises);
    results.forEach((result, index) => {
      if (result.status === 'rejected') return;
      const balance = result.value;
      const id = Object.keys(this._balanceSubscribes)[index];
      const subscribe = this._balanceSubscribes[id];
      if (balance === subscribe.lastBalance) {
        return;
      }
      const data: BalanceChangeData = {
        request: parseBalanceRequest(id),
        balance,
        lastBalance: subscribe.lastBalance
      };
      logger.debug('[sdk] balance changed', data);
      subscribe.handlers.forEach((handler) => handler(data));
      subscribe.lastBalance = balance;
    });
  };

  private assertConnected = () => {
    if (!this._connected) {
      throw new HibitIdError(
        HibitIdErrorCode.WALLET_NOT_CONNECTED,
        'Wallet is not connected'
      );
    }
  };

  private toggleIframe = () => {
    if (!this._iframe) return;
    if (this._iframe.visible) {
      this._iframe.hide();
    } else {
      this.showIframe();
    }
  };

  private prepareIframe = async () => {
    if (this._rpc && this._iframe) {
      await this._rpc.isReady;
      return;
    }

    this._iframe = new HibitIdIframe(
      this._options.env,
      this._options.chains,
      this._options.iframeUrlAppendix,
      this._options.lang,
      this._options.fixDevMode ?? 'unset'
    );

    const rpc = new RPC({
      // The window you want to talk to:
      target: this._iframe.iframe.contentWindow!,
      // This should be unique for each of your producer<->consumer pairs:
      serviceId: RPC_SERVICE_NAME
      // Optionally, allowlist the origin you want to talk to:
      // origin: 'example.com',
    });
    rpc.expose(SdkExposeRPCMethod.CLOSE, this.onRpcClose);
    rpc.expose(SdkExposeRPCMethod.CONNECTED, this.onRpcConnected);
    rpc.expose(SdkExposeRPCMethod.DISCONNECTED, this.onRpcDisconnected);
    rpc.expose(SdkExposeRPCMethod.IFRAME_READY, this.onRpcIframeReady);
    rpc.expose(SdkExposeRPCMethod.LOGIN_CHANGED, this.onRpcLoginChanged);
    rpc.expose(SdkExposeRPCMethod.CHAIN_CHANGED, this.onRpcChainChanged);
    rpc.expose(SdkExposeRPCMethod.ACCOUNTS_CHANGED, this.onRpcAccountsChanged);
    rpc.expose(SdkExposeRPCMethod.PASSWORD_CHANGED, this.onRpcPasswordChanged);
    this._rpc = rpc;

    logger.debug('[sdk rpc init]');
    await rpc.isReady;
    await this._iframeReadyPromise.promise;

    if (this._options.embedMode === 'background') {
      await this._rpc.call(WalletExposeRPCMethod.SET_BACKGROUND_EMBED, {
        value: true
      } as SetBackgroundEmbedRequest);
      logger.debug('[sdk request background embed]');
    }
    logger.debug('[sdk rpc ready]');
  };

  private handleControllerMove = (x: number, y: number) => {
    if (!this._iframe || !this._iframe.isDesktop) return;
    const controllerRect = this._controller?.getBoundingRect();
    const maxRight = window.innerWidth - (controllerRect?.width ?? 0);
    const maxBottom = window.innerHeight - (controllerRect?.height ?? 0);
    const right = clamp(
      0,
      controllerRect ? window.innerWidth - controllerRect.right : 50,
      maxRight
    );
    const bottom = clamp(
      0,
      controllerRect ? window.innerHeight - controllerRect.top + 20 : 50,
      maxBottom
    );
    this._iframe.updateStyle({
      right: `${right}px`,
      bottom: `${bottom}px`
    });
  };

  private showIframe = (fullscreen?: boolean) => {
    if (!this._iframe) return;
    if (fullscreen) {
      this._iframe.show('fullscreen');
    } else {
      const controllerRect = this._controller?.getBoundingRect();
      this._iframe.show(
        this._options.embedMode === 'background' ? 'centered' : 'floating',
        controllerRect
          ? {
              right: window.innerWidth - controllerRect.right,
              bottom: window.innerHeight - controllerRect.top + 20
            }
          : undefined,
        this._options.embedMode === 'background'
      );
    }
  };

  private onRpcClose = () => {
    logger.debug('[sdk on Close]');
    this._iframe?.hide();
    this._controller?.setOpen(false);
  };

  private onRpcLoginChanged = (input: LoginChangedRequest) => {
    logger.debug('[sdk on LoginChanged]', { input });
    // only show iframe during connection
    this._hasSession = input.isLogin;
    if (!input.isLogin) {
      sessionStorage.removeItem(LOGIN_SESSION_KEY);
      if (this._connectPromise) {
        this.showIframe(true);
      }
    } else {
      sessionStorage.setItem(LOGIN_SESSION_KEY, input.sub || '');
      if (!this._controller && this._options.embedMode !== 'background') {
        this._controller = new HibitIdController(
          this.toggleIframe,
          this.handleControllerMove,
          this._options.controllerDefaultPosition
        );
      }
      if (this._connectPromise) {
        this.showIframe();
        this._controller?.setOpen(true);
      }
    }
  };

  private onRpcChainChanged = (input: ChainChangedRequest) => {
    logger.debug('[sdk on ChainChanged]', { input });
    this._eventHandlers.chainChanged.forEach((handler) => {
      handler(input.chainId);
    });
  };

  private onRpcAccountsChanged = (input: AccountsChangedRequest) => {
    logger.debug('[sdk on AccountsChanged]', { input });
    this._eventHandlers.accountsChanged.forEach((handler) => {
      handler(input.account);
    });
  };

  private onRpcPasswordChanged = (input: PasswordChangedRequest) => {
    logger.debug('[sdk on PasswordChanged]', { input });
    if (this._options.embedMode === 'background') {
      this._iframe?.hide();
    }
  };

  private onRpcIframeReady = () => {
    logger.debug('[sdk on IframeReady]');
    this._iframeReadyPromise.resolve(true);
  };

  private onRpcConnected = (input: ConnectedRequest | null) => {
    logger.debug('[sdk on Connected]');
    if (input) {
      this._connected = true;
    }
    if (this._options.embedMode === 'background') {
      this._iframe?.hide();
    }
    this._connectPromise?.resolve(input);
    this._connectPromise = null;
  };

  private onRpcDisconnected = () => {
    logger.debug('[sdk on Disconnected]');
    this._connected = false;
    this._disconnectedPromise?.resolve(true);
  };

  private getRpcErrorMessage = (e: any) => {
    const rawMessage =
      (e.message as string)?.split('\n')[0].replace('Error: ', '') || String(e);

    // Sanitize error message to remove sensitive data
    return logger.sanitizeErrorMessage(rawMessage);
  };
}
