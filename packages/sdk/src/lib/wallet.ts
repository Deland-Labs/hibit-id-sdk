import { RPC } from '@mixer/postmessage-rpc';
import { RPC_SERVICE_NAME } from './constants';
import { HibitIdController, HibitIdIframe } from './dom';
import {
  BalanceChangeData,
  BridgePromise,
  ChainAccountInfo,
  GetAccountRequest,
  GetAccountResponse,
  GetAccountsRequest,
  GetAccountsResponse,
  GetBalanceRequest,
  GetBalanceResponse,
  GetAssetDecimalsRequest,
  GetAssetDecimalsResponse,
  GetEstimatedFeeRequest,
  GetEstimatedFeeResponse,
  HibitIdError,
  HibitIdWalletOptions,
  LoginStateChangeNotification,
  PasswordChangeNotification,
  UpdateEmbedModeRequest,
  SignMessageRequest,
  SignMessageResponse,
  TransferRequest,
  TransferResponse,
  VerifyPasswordRequest,
  VerifyPasswordResponse
} from './types';
import {
  SdkExposeRPCMethod,
  WalletExposeRPCMethod,
  AuthenticatorType
} from './enums';
import { HibitIdSdkErrorCode } from '@delandlabs/coin-base';
import { clamp, parseBalanceRequest, stringifyBalanceRequest } from './utils';
import { ChainAccount, ChainId } from '@delandlabs/hibit-basic-types';
import { logger } from './utils/logger';

const LOGIN_SESSION_KEY = 'hibit-id-session';
const BALANCE_POLL_INTERVAL = 5000;

export class HibitIdWallet {
  // Private fields
  private _options: HibitIdWalletOptions;
  private _hasSession = false;
  private _connected = false;
  private _rpc: RPC | null = null;
  private _controller: HibitIdController | null = null;
  private _iframe: HibitIdIframe | null = null;
  private _iframeReadyPromise = new BridgePromise<boolean>();
  private _connectPromise: BridgePromise<void> | null = null;
  private _disconnectedPromise: BridgePromise<boolean> | null = null;
  // Note: In SDK V2, event handlers for activeChainChanged are removed
  // as the SDK becomes stateless
  private _balanceSubscribes: Record<
    string,
    {
      lastBalance: string | null;
      handlers: Array<(data: BalanceChangeData) => void>;
    }
  > = {};
  private _balancePollIntervalId: NodeJS.Timeout | null = null;

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

  // Public getter
  get isConnected() {
    return this._connected;
  }

  // Public methods
  public connect = async (authType?: AuthenticatorType) => {
    logger.debug('[sdk call Connect]', { authType });
    await this._iframeReadyPromise.promise;

    if (this._connected) {
      logger.debug('[sdk already connected]');
      return;
    }

    try {
      this.showIframe(!this._hasSession);
      this._connectPromise = new BridgePromise<void>();
      this._rpc!.call(WalletExposeRPCMethod.CONNECT, {
        authType
      });
      
      try {
        await this._connectPromise?.promise;
        this._connected = true;
        logger.debug('[sdk connected]');
      } catch (error: any) {
        throw new HibitIdError(
          HibitIdSdkErrorCode.USER_CANCEL_CONNECTION,
          error?.message || 'User manually canceled'
        );
      }
    } catch (e) {
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Connect failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  /**
   * Gets account information for all supported chains.
   *
   * @returns Array of ChainAccountInfo with account info and status
   */
  public getAccounts = async (): Promise<ChainAccountInfo[]> => {
    logger.debug('[sdk call GetAccounts]');
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<GetAccountsResponse>(
        WalletExposeRPCMethod.GET_ACCOUNTS,
        {} as GetAccountsRequest
      );
      if (!res?.success) {
        throw new HibitIdError(
          HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
          (res as any)?.errMsg || 'Failed to get accounts'
        );
      }
      return res.data.accounts;
    } catch (e) {
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Get accounts failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  /**
   * Gets account information for a specific chain.
   *
   * @param chainId The chain ID to get account for (required in V2)
   * @returns ChainAccount for the specified chain
   */
  public getAccount = async (chainId: ChainId): Promise<ChainAccount> => {
    logger.debug('[sdk call GetAccount]', { chainId });
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
        throw new HibitIdError(
          HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
          (res as any)?.errMsg || 'Failed to get account'
        );
      }
      return res.data;
    } catch (e) {
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Get account failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public signMessage = async (request: {
    chainId: ChainId;
    message: string;
  }): Promise<string> => {
    const { chainId, message } = request;
    logger.debug('[sdk call SignMessage]', { chainId, message });
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
        throw new HibitIdError(
          HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
          (res as any)?.errMsg || 'Failed to sign message'
        );
      }
      return res.data.signature ?? null;
    } catch (e) {
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Sign message failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public getBalance = async (request: GetBalanceRequest): Promise<string> => {
    logger.debug('[sdk call GetBalance]', { request });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<GetBalanceResponse>(
        WalletExposeRPCMethod.GET_BALANCE,
        request
      );
      if (!res?.success) {
        throw new HibitIdError(
          HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
          (res as any)?.errMsg || 'Failed to get balance'
        );
      }
      return res.data.balance ?? null;
    } catch (e) {
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Get balance failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public getAssetDecimals = async (
    request: GetAssetDecimalsRequest
  ): Promise<number> => {
    logger.debug('[sdk call GetAssetDecimals]', { request });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<GetAssetDecimalsResponse>(
        WalletExposeRPCMethod.GET_ASSET_DECIMALS,
        request
      );
      if (!res?.success) {
        throw new HibitIdError(
          HibitIdSdkErrorCode.UNKNOWN_ERROR,
          res?.errMsg || 'Get asset decimals failed'
        );
      }
      return res.data.decimals;
    } catch (e) {
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Get asset decimals failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public transfer = async (request: TransferRequest): Promise<string> => {
    logger.debug('[sdk call Transfer]', { request });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<TransferResponse>(
        WalletExposeRPCMethod.TRANSFER,
        request
      );
      if (!res?.success) {
        throw new HibitIdError(
          HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
          (res as any)?.errMsg || 'Failed to transfer'
        );
      }
      return res.data.txHash ?? null;
    } catch (e) {
      logger.error('Operation failed', JSON.stringify(e));
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Transfer failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  public getEstimatedFee = async (
    request: GetEstimatedFeeRequest
  ): Promise<string> => {
    logger.debug('[sdk call getEstimatedFee]', { request });
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<GetEstimatedFeeResponse>(
        WalletExposeRPCMethod.GET_ESTIMATED_FEE,
        request
      );
      if (!res?.success) {
        throw new HibitIdError(
          HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
          (res as any)?.errMsg || 'Failed to get estimated fee'
        );
      }
      return res.data.fee ?? null;
    } catch (e) {
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Get estimated fee failed: ${this.getRpcErrorMessage(e)}`
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

    // Clear balance polling interval to prevent memory leaks
    if (this._balancePollIntervalId) {
      clearInterval(this._balancePollIntervalId);
      this._balancePollIntervalId = null;
    }

    // Clear all balance subscriptions
    this._balanceSubscribes = {};

    // V2: Event handlers have been removed

    // Clean up session storage
    sessionStorage.removeItem(LOGIN_SESSION_KEY);

    // Clean up controller
    this._controller?.destroy();
    this._controller = null;

    // Reset connection state
    this._connected = false;
    this._hasSession = false;

    // Clean up promises
    this._iframeReadyPromise = new BridgePromise<boolean>();
    this._connectPromise = null;
    this._disconnectedPromise = null;

    // Clean up RPC connection
    this._rpc?.destroy();
    this._rpc = null;

    // Clean up iframe
    this._iframe?.destroy();
    this._iframe = null;
  };

  // Note: switchToChain is deprecated in V2 as the SDK is now stateless

  public setBackgroundEmbed = async (value: boolean) => {
    logger.debug('[sdk call SetBackgroundEmbed]', { value });
    if (value && this._options.embedMode === 'background') return;
    if (!value && this._options.embedMode !== 'background') return;
    await this._iframeReadyPromise.promise;
    await this._rpc?.call(WalletExposeRPCMethod.SET_BACKGROUND_EMBED, {
      value
    } as UpdateEmbedModeRequest);
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

  public showChangePassword = async () => {
    logger.debug('[sdk call showChangePassword]');
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    await this._rpc?.call(WalletExposeRPCMethod.SHOW_CHANGE_PASSWORD, {});
    this.showIframe();
  };

  public verifyPassword = async (
    option: VerifyPasswordRequest = { password: '' }
  ): Promise<boolean> => {
    const request: VerifyPasswordRequest = option;
    logger.debug('[sdk call verifyPassword]');
    await this._iframeReadyPromise.promise;
    this.assertConnected();
    try {
      const res = await this._rpc?.call<VerifyPasswordResponse>(
        WalletExposeRPCMethod.VERIFY_PASSWORD,
        request
      );
      if (!res?.success) {
        throw new HibitIdError(
          HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
          (res as any)?.errMsg || 'Failed to verify password'
        );
      }
      return true;
    } catch (e) {
      throw new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        `Verify password failed: ${this.getRpcErrorMessage(e)}`
      );
    }
  };

  // Note: addEventListener and removeEventListener are deprecated in V2
  // The SDK no longer emits activeChainChanged events
  // Use getAccounts() or getAccount(chainId) to get current state

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
      if (this._balancePollIntervalId) {
        clearInterval(this._balancePollIntervalId);
        this._balancePollIntervalId = null;
      }
    }
  };

  // Private methods
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
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
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
    rpc.expose(SdkExposeRPCMethod.IFRAME_CLOSE, this.onRpcClose);
    rpc.expose(SdkExposeRPCMethod.CONNECTED, this.onRpcConnected);
    rpc.expose(SdkExposeRPCMethod.DISCONNECTED, this.onRpcDisconnected);
    rpc.expose(SdkExposeRPCMethod.IFRAME_READY, this.onRpcIframeReady);
    rpc.expose(SdkExposeRPCMethod.LOGIN_CHANGED, this.onRpcLoginChanged);
    rpc.expose(SdkExposeRPCMethod.PASSWORD_CHANGED, this.onRpcPasswordChanged);
    this._rpc = rpc;

    logger.debug('[sdk rpc init]');
    await rpc.isReady;
    await this._iframeReadyPromise.promise;

    if (this._options.embedMode === 'background') {
      await this._rpc.call(WalletExposeRPCMethod.SET_BACKGROUND_EMBED, {
        value: true
      } as UpdateEmbedModeRequest);
      logger.debug('[sdk request background embed]');
    }
    logger.debug('[sdk rpc ready]');
  };

  private handleControllerMove = (_x: number, _y: number) => {
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

  private onRpcLoginChanged = (input: LoginStateChangeNotification) => {
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

  private onRpcPasswordChanged = (input: PasswordChangeNotification) => {
    logger.debug('[sdk on PasswordChanged]', { input });
    if (this._options.embedMode === 'background') {
      this._iframe?.hide();
    }
  };

  private onRpcIframeReady = () => {
    logger.debug('[sdk on IframeReady]');
    this._iframeReadyPromise.resolve(true);
  };

  private onRpcConnected = (success: boolean) => {
    logger.debug('[sdk on Connected]', { success });
    
    if (success) {
      this._connected = true;
      this._connectPromise?.resolve();
    } else {
      this._connectPromise?.reject('Connection failed or cancelled');
    }
    
    if (this._options.embedMode === 'background') {
      this._iframe?.hide();
    }
    
    this._connectPromise = null;
  };

  private onRpcDisconnected = () => {
    logger.debug('[sdk on Disconnected]');
    this._connected = false;
    this._disconnectedPromise?.resolve(true);
  };

  private getRpcErrorMessage = (e: unknown) => {
    const rawMessage =
      (e instanceof Error ? e.message : String(e))
        ?.split('\n')[0]
        .replace('Error: ', '') || String(e);

    // Sanitize error message to remove sensitive data
    return logger.sanitizeErrorMessage(rawMessage);
  };
}
