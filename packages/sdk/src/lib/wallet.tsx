import { RPC } from '@mixer/postmessage-rpc';
import { RPC_SERVICE_NAME } from './constants';
import { HibitIdController, HibitIdIframe } from './dom';
import { PasskeyLoginResponse, BridgePromise, HibitEnv, SignMessageResponse } from './types';
import { ClientExposeRPCMethod, HibitIdExposeRPCMethod } from './enums';

export class HibitWallet {
  private _env: HibitEnv = 'prod'
  private _connected = false
  private _rpc: RPC | null = null
  private _controller: HibitIdController | null = null
  private _iframe: HibitIdIframe | null = null
  private _authorizePromise: BridgePromise<PasskeyLoginResponse> | null = null

  constructor(env: HibitEnv) {
    this._env = env
  }

  get isConnected() {
    return this._connected
  }

  public connect = async () => {
    this._iframe = new HibitIdIframe(this._env, 'login')
    await this.establishRPC(this._iframe.iframe)
    this._authorizePromise = new BridgePromise<PasskeyLoginResponse>()
    const res = await this._authorizePromise.promise
    this._iframe.hide()
    this._connected = true
    this._controller = new HibitIdController(this._iframe.toggle)
    return res
  }

  public signMessage = async (message: string) => {
    // await this.showWallet()
    const res = await this._rpc?.call<SignMessageResponse>(HibitIdExposeRPCMethod.SIGN_MESSAGE, {
      message,
    })
    return res?.signature
  }

  public disconnect = async () => {
    this._rpc?.destroy()
    this._rpc = null
    this._iframe?.destroy()
    this._controller?.destroy()
    this._connected = false
  }

  private establishRPC = async (iframe: HTMLIFrameElement) => {
    this._rpc?.destroy()
    this._rpc = null

    const rpc = new RPC({
      // The window you want to talk to:
      target: iframe.contentWindow!,
      // This should be unique for each of your producer<->consumer pairs:
      serviceId: RPC_SERVICE_NAME,
      // Optionally, allowlist the origin you want to talk to:
      // origin: 'example.com',
    });
    rpc.expose(ClientExposeRPCMethod.CLOSE, this.rpcClose);
    rpc.expose(ClientExposeRPCMethod.PASSKEY_LOGIN, this.rpcPasskeyLogin);

    await rpc.isReady
    this._rpc = rpc
  }

  private rpcClose = () => {
    this._iframe?.hide()
    this._controller?.setOpen(false)
  }

  private rpcPasskeyLogin = async (response: PasskeyLoginResponse) => {
    this._authorizePromise?.resolve(response)
  }
}
