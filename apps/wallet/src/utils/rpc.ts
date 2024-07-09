import { RPC } from '@mixer/postmessage-rpc'
import { ClientExposeRPCMethod, HibitIdExposeRPCMethod, PasskeyLoginResponse, RPC_SERVICE_NAME, SignMessageRequest, SignMessageResponse } from 'sdk'
import hibitIdSession from '../stores/session';

class RPCManager {
  private _rpc: RPC | null = null

  constructor() {
    const rpc = new RPC({
      // The window you want to talk to:
      target: window.parent,
      // This should be unique for each of your producer<->consumer pairs:
      serviceId: RPC_SERVICE_NAME,
      // Optionally, allowlist the origin you want to talk to:
      // origin: 'example.com',
    });
    rpc.expose(HibitIdExposeRPCMethod.SIGN_MESSAGE, this.rpcSignMessage);
    this._rpc = rpc
  }

  get rpc() {
    return this._rpc
  }

  public onClose = () => {
    this._rpc?.call(ClientExposeRPCMethod.CLOSE, {})
  }

  public onLogin = (response: PasskeyLoginResponse) => {
    this._rpc?.call(ClientExposeRPCMethod.PASSKEY_LOGIN, response)
  }

  private rpcSignMessage = async (input: SignMessageRequest): Promise<SignMessageResponse> => {
    if (!hibitIdSession.wallet) {
      throw new Error('Wallet not initialized')
    }
    const signature = await hibitIdSession.wallet.signMessage(input.message)
    return {
      signature
    }
  }
}

const rpcManager = new RPCManager()
export default rpcManager
