import { RPC } from '@mixer/postmessage-rpc'
import { AccountsChangedRequest, ChainChangedRequest, ClientExposeRPCMethod, ConnectResponse, GetBalanceRequest, GetBalanceResponse, HibitIdAssetType, HibitIdChainId, HibitIdExposeRPCMethod, RPC_SERVICE_NAME, SignMessageRequest, SignMessageResponse, TransferRequest, TransferResponse, WalletAccount } from 'sdk'
import hibitIdSession from './session';
import { BridgePromise } from 'sdk';
import { makeAutoObservable } from 'mobx';
import { AssetInfo } from '../utils/chain/chain-wallets/types';
import { Chain, ChainAssetType, ChainId, ChainInfo, ChainNetwork, DecimalPlaces } from '../utils/basicTypes';
import BigNumber from 'bignumber.js';
import { SwitchChainRequest } from '../../../../packages/sdk/dist/lib/types';
import { getChainByChainId } from '../utils/chain';

class RPCManager {
  private _rpc: RPC | null = null
  private _connectPromise: BridgePromise<ConnectResponse> | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get rpc() {
    return this._rpc
  }

  public init = async () => {
    this._rpc?.destroy()
    const rpc = new RPC({
      // The window you want to talk to:
      target: window.parent,
      // This should be unique for each of your producer<->consumer pairs:
      serviceId: RPC_SERVICE_NAME,
      // Optionally, allowlist the origin you want to talk to:
      // origin: 'example.com',
    });
    rpc.expose(HibitIdExposeRPCMethod.GET_ACCOUNT, this.onRpcGetAccount);
    rpc.expose(HibitIdExposeRPCMethod.GET_CHAIN_INFO, this.onRpcGetChainInfo);
    rpc.expose(HibitIdExposeRPCMethod.SIGN_MESSAGE, this.onRpcSignMessage);
    rpc.expose(HibitIdExposeRPCMethod.CONNECT, this.onRpcConnect);
    rpc.expose(HibitIdExposeRPCMethod.GET_BALANCE, this.onRpcGetBalance);
    rpc.expose(HibitIdExposeRPCMethod.TRANSFER, this.onRpcTransfer);
    rpc.expose(HibitIdExposeRPCMethod.SWITCH_CHAIN, this.onRpcSwitchChain);
    rpc.expose(HibitIdExposeRPCMethod.DISCONNECT, this.onRpcDisconnect);

    console.log('[wallet rpc init]')
    await rpc.isReady
    console.log('[wallet rpc ready]')
    this._rpc = rpc
  }

  public notifyClose = () => {
    this._connectPromise?.reject('User manually closed')
    this._rpc?.call(ClientExposeRPCMethod.CLOSE, {})
  }

  public notifyChainChanged = (chainInfo: ChainInfo) => {
    this._rpc?.call(ClientExposeRPCMethod.CHAIN_CHANGED, { chainId: chainInfo.chainId.toString() } as ChainChangedRequest)
  }

  public notifyAccountsChanged = (account: WalletAccount | null) => {
    this._rpc?.call(ClientExposeRPCMethod.ACCOUNTS_CHANGED, { account } as AccountsChangedRequest)
  }

  public resolveConnect = (response: ConnectResponse) => {
    this._connectPromise?.resolve(response)
  }

  public rejectConnect = (error: string) => {
    this._connectPromise?.reject(error)
  }

  private onRpcGetAccount = async (): Promise<WalletAccount> => {
    console.log('[hibitid]', 'onRpcGetAccount')
    this.checkInit()
    return await hibitIdSession.wallet!.getAccount()
  }

  private onRpcGetChainInfo = async () => {
    console.log('[hibitid]', 'onRpcGetChainInfo')
    this.checkInit()
    return hibitIdSession.wallet!.chainInfo
  }

  private onRpcSignMessage = async (input: SignMessageRequest): Promise<SignMessageResponse> => {
    console.log('[hibitid]', 'onRpcSignMessage')
    this.checkInit()
    const signature = await hibitIdSession.wallet!.signMessage(input.message)
    return {
      signature
    }
  }

  private onRpcConnect = async (): Promise<ConnectResponse> => {
    console.log('[hibitid]', 'onRpcConnect')
    this._connectPromise = new BridgePromise()
    const res = await this._connectPromise.promise
    return res
  }

  private onRpcGetBalance = async ({ assetType, chainId: hibitIdChainId, contractAddress, decimalPlaces }: GetBalanceRequest): Promise<GetBalanceResponse> => {
    console.log('[hibitid]', 'onRpcGetBalance')
    this.checkInit()
    if (!contractAddress && typeof assetType !== 'undefined' && assetType !== HibitIdAssetType.Native) {
      throw new Error('Contract address is required for non-native assets')
    }
    const address = (await hibitIdSession.wallet!.getAccount()).address
    const chainId = hibitIdChainId ? this.mapChainId(hibitIdChainId) : hibitIdSession.wallet!.chainInfo.chainId
    const decimal = decimalPlaces ?? hibitIdSession.wallet!.chainInfo.nativeAssetDecimals
    const assetInfo: AssetInfo = {
      chainAssetType: assetType ? this.mapAssetType(assetType) : ChainAssetType.Native,
      chain: chainId.type,
      chainNetwork: chainId.network,
      contractAddress: contractAddress || '',
      decimalPlaces: new DecimalPlaces(decimal)
    }
    const balance = await hibitIdSession.wallet!.balanceOf(address, assetInfo)
    return {
      balance: balance.shiftedBy(decimal).toString()
    }
  }

  private onRpcTransfer = async ({
    toAddress,
    amount,
    assetType,
    chainId: hibitIdChainId,
    contractAddress,
    decimalPlaces
  }: TransferRequest): Promise<TransferResponse> => {
    console.log('[hibitid]', 'onRpcTransfer')
    this.checkInit()
    if (assetType !== HibitIdAssetType.Native && (!contractAddress || !decimalPlaces )) {
      throw new Error('Contract address and decimal is required for non-native assets')
    }
    const chainId = hibitIdChainId ? this.mapChainId(hibitIdChainId) : hibitIdSession.wallet!.chainInfo.chainId
    const decimal = decimalPlaces ?? hibitIdSession.wallet!.chainInfo.nativeAssetDecimals
    const amountBn = new BigNumber(amount).shiftedBy(-decimal)
    const assetInfo: AssetInfo = {
      chainAssetType: assetType ? this.mapAssetType(assetType) : ChainAssetType.Native,
      chain: chainId.type,
      chainNetwork: chainId.network,
      contractAddress: contractAddress || '',
      decimalPlaces: new DecimalPlaces(decimal)
    }
    const txHash = await hibitIdSession.wallet!.transfer(toAddress, amountBn, assetInfo)
    return {
      txHash
    }
  }

  private onRpcDisconnect = async () => {
    hibitIdSession.disconnect()
  }

  private onRpcSwitchChain = async ({ chainId }: SwitchChainRequest) => {
    console.log('[hibitid]', 'onRpcSwitchChain')
    const [type, network] = chainId.split('_')
    if (!type || !network) {
      throw new Error(`onRpcSwitchChain: Invalid chainId ${chainId}`)
    }
    const chainIdInstance = new ChainId(Chain.fromString(type)!, ChainNetwork.fromString(network)!)
    const chainInfo = getChainByChainId(chainIdInstance)
    if (!chainInfo) {
      throw new Error(`onRpcSwitchChain: Chain ${chainId} not supported`)
    }
    await hibitIdSession.switchChain(chainInfo)
  }

  private checkInit = () => {
    if (!hibitIdSession.wallet) {
      throw new Error('Wallet not initialized')
    }
  }

  private mapAssetType = (type: HibitIdAssetType): ChainAssetType => {
    return new ChainAssetType(new BigNumber(type))
  }

  private mapChainId = (id: HibitIdChainId): ChainId => {
    const [typeStr, networkStr] = id.split('_')
    return new ChainId(new Chain(new BigNumber(typeStr)), new ChainNetwork(new BigNumber(networkStr)))
  }
}

const rpcManager = new RPCManager()
export default rpcManager
