import { RPC } from '@mixer/postmessage-rpc'
import { ClientExposeRPCMethod, ConnectResponse, HibitIdExposeRPCMethod, RPC_SERVICE_NAME, SignMessageRequest, SignMessageResponse } from 'sdk'
import hibitIdSession from './session';
import { BridgePromise } from 'sdk';
import { makeAutoObservable } from 'mobx';

class RPCManager {
  private _rpc: RPC | null = null
  private _connectPromise: BridgePromise<ConnectResponse> | null = null
  private _authorized = false

  constructor() {
    makeAutoObservable(this)

    const rpc = new RPC({
      // The window you want to talk to:
      target: window.parent,
      // This should be unique for each of your producer<->consumer pairs:
      serviceId: RPC_SERVICE_NAME,
      // Optionally, allowlist the origin you want to talk to:
      // origin: 'example.com',
    });
    rpc.expose(HibitIdExposeRPCMethod.SIGN_MESSAGE, this.onRpcSignMessage);
    rpc.expose(HibitIdExposeRPCMethod.CONNECT, this.onRpcConnect);
    rpc.expose(HibitIdExposeRPCMethod.DISCONNECT, this.onRpcDisconnect);
    rpc.expose(HibitIdExposeRPCMethod.AUTHORIZE_DONE, this.onRpcAuthorizeDone);
    this._rpc = rpc
  }

  get rpc() {
    return this._rpc
  }

  get authorized() {
    return this._authorized
  }

  public notifyClose = () => {
    this._connectPromise?.reject('User manually closed')
    this._rpc?.call(ClientExposeRPCMethod.CLOSE, {})
  }

  public resolveConnect = (response: ConnectResponse) => {
    this._connectPromise?.resolve(response)
  }

  public rejectConnect = (error: string) => {
    this._connectPromise?.reject(error)
  }

  private onRpcSignMessage = async (input: SignMessageRequest): Promise<SignMessageResponse> => {
    if (!hibitIdSession.wallet) {
      throw new Error('Wallet not initialized')
    }
    const signature = await hibitIdSession.wallet.signMessage(input.message)
    return {
      signature
    }
  }

  private onRpcConnect = async (): Promise<ConnectResponse> => {
    this._connectPromise = new BridgePromise()
    const res = await this._connectPromise.promise
    return res
  }

  private onRpcDisconnect = async () => {
    hibitIdSession.disconnect()
  }

  private onRpcAuthorizeDone = async () => {
    this._authorized = true
  }
}

const rpcManager = new RPCManager()
export default rpcManager
