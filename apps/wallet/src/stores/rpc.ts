import { RPC } from '@mixer/postmessage-rpc'
import { AccountsChangedRequest, ChainChangedRequest, ClientExposeRPCMethod, ConnectResponse, GetBalanceRequest, GetBalanceResponse, HibitIdAssetType, HibitIdChainId, HibitIdExposeRPCMethod, RPC_SERVICE_NAME, SignMessageRequest, SignMessageResponse, TransferRequest, TransferResponse, WalletAccount, BridgePromise } from "@deland-labs/hibit-id-sdk"
import hibitIdSession from './session';
import { makeAutoObservable } from 'mobx';
import { AssetInfo } from '../utils/chain/chain-wallets/types';
import { Chain, ChainAssetType, ChainId, ChainInfo, ChainNetwork, DecimalPlaces } from '../utils/basicTypes';
import BigNumber from 'bignumber.js';
import { ConnectRequest, SwitchChainRequest } from '../../../../packages/sdk/dist/lib/types';
import { getChainByChainId } from '../utils/chain';

class RPCManager {
  private _rpc: RPC | null = null
  private _connectPromise: BridgePromise<ConnectResponse> | null = null

  constructor() {
    makeAutoObservable(this)
    console.debug('[wallet rpc constructor called]')
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

    console.debug('[wallet rpc init]')
    await rpc.isReady
    console.debug('[wallet rpc ready]')
    this._rpc = rpc
    this.notifyReady()
  }

  public notifyClose = () => {
    this._connectPromise?.reject('User manually closed')
    console.debug('[wallet notify close]')
    this._rpc?.call(ClientExposeRPCMethod.CLOSE, {})
  }

  public notifyReady = () => {
    console.debug('[wallet notify iframeReady]')
    this._rpc?.call(ClientExposeRPCMethod.IFRAME_READY, {})
  }

  public notifyLoginChanged = (isLogin: boolean, sub?: string) => {
    console.debug('[wallet notify login changed]', { isLogin, sub })
    this._rpc?.call(ClientExposeRPCMethod.LOGIN_CHANGED, { isLogin, sub })
  }

  public notifyChainChanged = (chainInfo: ChainInfo) => {
    console.debug('[wallet notify chain changed]', { chainInfo })
    this._rpc?.call(ClientExposeRPCMethod.CHAIN_CHANGED, { chainId: chainInfo.chainId.toString() } as ChainChangedRequest)
  }

  public notifyAccountsChanged = (account: WalletAccount | null) => {
    console.debug('[wallet notify accounts changed]', { account })
    this._rpc?.call(ClientExposeRPCMethod.ACCOUNTS_CHANGED, { account } as AccountsChangedRequest)
  }

  public resolveConnect = (response: ConnectResponse) => {
    this._connectPromise?.resolve(response)
  }

  public rejectConnect = (error: string) => {
    this._connectPromise?.reject(error)
  }

  private onRpcGetAccount = async (): Promise<WalletAccount> => {
    console.debug('[wallet on GetAccount]')
    this.checkInit()
    return await hibitIdSession.wallet!.getAccount()
  }

  private onRpcGetChainInfo = async () => {
    console.debug('[wallet on GetChainInfo]')
    this.checkInit()
    return hibitIdSession.wallet!.chainInfo
  }

  private onRpcSignMessage = async (input: SignMessageRequest): Promise<SignMessageResponse> => {
    console.debug('[wallet on SignMessage]', { input })
    this.checkInit()
    const signature = await hibitIdSession.wallet!.signMessage(input.message)
    return {
      signature
    }
  }

  private onRpcConnect = async (input: ConnectRequest): Promise<ConnectResponse> => {
    console.debug('[wallet on Connect]', { input })
    const chainInfo = getChainByChainId(ChainId.fromString(input.chainId))
    if (!chainInfo) {
      throw new Error('Chain not supported')
    }
    this._connectPromise = new BridgePromise()
    if (hibitIdSession.wallet) {
      if (!hibitIdSession.chainInfo.chainId.equals(chainInfo.chainId)) {
        await hibitIdSession.switchChain(chainInfo)
      }
      this.resolveConnect(await hibitIdSession.wallet.getAccount())
    } else {
      hibitIdSession.setChainInfo(chainInfo)
    }
    const res = await this._connectPromise.promise
    return res
  }

  private onRpcGetBalance = async ({ assetType, chainId: hibitIdChainId, contractAddress, decimalPlaces }: GetBalanceRequest): Promise<GetBalanceResponse> => {
    console.debug('[wallet on GetBalance]', { assetType, chainId: hibitIdChainId, contractAddress, decimalPlaces })
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
    console.debug('[wallet on Transfer]', { toAddress, amount, assetType, chainId: hibitIdChainId, contractAddress, decimalPlaces })
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
    console.debug('[wallet on Disconnect]')
    await hibitIdSession.disconnect()
  }

  private onRpcSwitchChain = async ({ chainId }: SwitchChainRequest) => {
    console.debug('[wallet on SwitchChain]', { chainId })
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
