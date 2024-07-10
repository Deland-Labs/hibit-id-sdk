import { RPC } from '@mixer/postmessage-rpc';
import { RPC_SERVICE_NAME } from './constants';
import { HibitIdController, HibitIdIframe } from './dom';
import { ConnectResponse, HibitEnv, SignMessageResponse } from './types';
import { ClientExposeRPCMethod, HibitIdExposeRPCMethod } from './enums';

export class HibitIdWallet {
  private _env: HibitEnv = 'prod'
  private _connected = false
  private _rpc: RPC | null = null
  private _controller: HibitIdController | null = null
  private _iframe: HibitIdIframe | null = null

  constructor(env: HibitEnv) {
    this._env = env
  }

  get isConnected() {
    return this._connected
  }

  public connect = async (onPostConnect?: (walletAccount: ConnectResponse) => Promise<void>) => {
    try {
      this._iframe = new HibitIdIframe(this._env, 'login')
      await this.establishRPC(this._iframe.iframe)
      const res = await this._rpc!.call<ConnectResponse>(HibitIdExposeRPCMethod.CONNECT, {})
      if (!res) {
        throw new Error('No response from wallet')
      }
      await onPostConnect?.(res)
      this._iframe.hide()
      this._connected = true
      this._controller = new HibitIdController(this._iframe.toggle)
      return res
    } catch (e) {
      throw new Error(`Connect failed: ${e instanceof Error ? e.message : e}`)
    } finally {
      await this._rpc?.call(HibitIdExposeRPCMethod.AUTHORIZE_DONE, {})
    }
  }

  public signMessage = async (message: string) => {
    try {
      const res = await this._rpc?.call<SignMessageResponse>(HibitIdExposeRPCMethod.SIGN_MESSAGE, {
        message,
      })
      return res?.signature
    } catch (e) {
      throw new Error(`Sign message failed: ${e instanceof Error ? e.message : e}`)
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
    rpc.expose(ClientExposeRPCMethod.CLOSE, this.onRpcClose);

    await rpc.isReady
    this._rpc = rpc
  }

  private onRpcClose = () => {
    this._iframe?.hide()
    this._controller?.setOpen(false)
  }
}
