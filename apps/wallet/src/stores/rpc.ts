import { RPC } from '@mixer/postmessage-rpc'
import { AccountsChangedRequest, ChainChangedRequest, ClientExposeRPCMethod, GetBalanceRequest, GetBalanceResponse, HibitIdAssetType, HibitIdChainId, HibitIdExposeRPCMethod, RPC_SERVICE_NAME, SignMessageRequest, SignMessageResponse, TransferRequest, TransferResponse, WalletAccount } from "@deland-labs/hibit-id-sdk"
import { makeAutoObservable } from 'mobx';
import { AssetInfo } from '../utils/chain/chain-wallets/types';
import { Chain, ChainAssetType, ChainId, ChainInfo, ChainNetwork, DecimalPlaces } from '../utils/basicTypes';
import BigNumber from 'bignumber.js';
import { ConnectRequest, GetAccountResponse, GetChainInfoResponse, SwitchChainRequest } from '../../../../packages/sdk/dist/lib/types';
import { getChainByChainId } from '../utils/chain';
import authManager from '../utils/auth';
import { prOidc } from '../utils/oidc';
import hibitIdSession from './session';
import { ChainWalletPool } from '../utils/chain/chain-wallets';

const PASSIVE_DISCONNECT_STORAGE_KEY = 'hibitId-passive-disconnect'
const ACTIVE_DISCONNECT_STORAGE_KEY = 'hibitId-active-disconnect'

class RPCManager {
  private _rpc: RPC | null = null
  private _walletPool: ChainWalletPool | null = null
  private _chainInfo: ChainInfo | null = null

  constructor() {
    makeAutoObservable(this)
    console.debug('[wallet rpc constructor called]')
  }

  get passiveDisconnecting() {
    return !!sessionStorage.getItem(PASSIVE_DISCONNECT_STORAGE_KEY)
  }

  get activeDisconnecting() {
    return !!sessionStorage.getItem(ACTIVE_DISCONNECT_STORAGE_KEY)
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

  public setWalletPool = (walletPool: ChainWalletPool) => {
    console.debug('[wallet set wallet]')
    this._walletPool = walletPool
  }

  public setChainInfo = (chainInfo: ChainInfo) => {
    console.debug('[wallet set chain]')
    this._chainInfo = chainInfo
  }

  public beginActiveDisconnect = () => {
    sessionStorage.setItem(ACTIVE_DISCONNECT_STORAGE_KEY, Date.now().toString())
  }

  public notifyClose = () => {
    this.notifyConnected(null)
    console.debug('[wallet notify close]')
    this._rpc?.call(ClientExposeRPCMethod.CLOSE, {})
  }

  public notifyReady = () => {
    console.debug('[wallet notify iframeReady]')
    this._rpc?.call(ClientExposeRPCMethod.IFRAME_READY, {})
  }

  public notifyConnected = (account: WalletAccount | null) => {
    console.debug('[wallet notify Connected]')
    this._rpc?.call(ClientExposeRPCMethod.CONNECTED, account || {})
  }

  public notifyDisconnected = () => {
    console.debug('[wallet notify Disconnected]')
    this._rpc?.call(ClientExposeRPCMethod.DISCONNECTED, {})
    sessionStorage.removeItem(PASSIVE_DISCONNECT_STORAGE_KEY)
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
    sessionStorage.removeItem(ACTIVE_DISCONNECT_STORAGE_KEY)
  }

  private onRpcGetAccount = async (): Promise<GetAccountResponse> => {
    console.debug('[wallet on GetAccount]')
    try {
      this.checkInit()
      const account = await this._walletPool!.getAccount(this._chainInfo!.chainId)
      return {
        success: true,
        data: account
      }
    } catch (e: any) {
      return {
        success: false,
        errMsg: e.message || String(e)
      }
    }
  }

  private onRpcGetChainInfo = async (): Promise<GetChainInfoResponse> => {
    console.debug('[wallet on GetChainInfo]')
    try {
      this.checkInit()
      const info = this._chainInfo!
      return {
        success: true,
        data: {
          chainInfo: {
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
          }
        }
      }
    } catch (e: any) {
      return {
        success: false,
        errMsg: e.message || String(e)
      }
    }
  }

  private onRpcSignMessage = async (input: SignMessageRequest): Promise<SignMessageResponse> => {
    console.debug('[wallet on SignMessage]', { input })
    try {
      this.checkInit()
      const signature = await this._walletPool!.signMessage(input.message, this._chainInfo!.chainId)
      return {
        success: true,
        data: {
          signature
        }
      }
    } catch (e: any) {
      return {
        success: false,
        errMsg: e.message || String(e)
      }
    }
  }

  private onRpcConnect = async (input: ConnectRequest): Promise<void> => {
    console.debug('[wallet on Connect]', { input })
    const chainInfo = getChainByChainId(ChainId.fromString(input.chainId))
    if (!chainInfo) {
      throw new Error('Chain not supported')
    }
    if (this._walletPool) {
      if (!this._chainInfo!.chainId.equals(chainInfo.chainId)) {
        await hibitIdSession.switchChain(chainInfo)
      }
      this.notifyConnected(hibitIdSession.account)
    } else {
      hibitIdSession.setChainInfo(chainInfo)
    }
  }

  private onRpcGetBalance = async ({ assetType, chainId: hibitIdChainId, contractAddress, decimalPlaces }: GetBalanceRequest): Promise<GetBalanceResponse> => {
    console.debug('[wallet on GetBalance]', { assetType, chainId: hibitIdChainId, contractAddress, decimalPlaces })
    try {
      this.checkInit()
      if (!contractAddress && typeof assetType !== 'undefined' && assetType !== HibitIdAssetType.Native) {
        throw new Error('Contract address is required for non-native assets')
      }
      const chainInfo = hibitIdChainId ? getChainByChainId(ChainId.fromString(hibitIdChainId)) : this._chainInfo
      if (!chainInfo) {
        throw new Error('Chain not supported')
      }
      const address = (await this._walletPool!.getAccount(chainInfo.chainId)).address
      const chainId = chainInfo.chainId
      const decimal = decimalPlaces ?? chainInfo.nativeAssetDecimals
      const assetInfo: AssetInfo = {
        chainAssetType: assetType ? this.mapAssetType(assetType) : ChainAssetType.Native,
        chain: chainId.type,
        chainNetwork: chainId.network,
        contractAddress: contractAddress || '',
        decimalPlaces: new DecimalPlaces(decimal)
      }
      const balance = await this._walletPool!.balanceOf(address, assetInfo)
      return {
        success: true,
        data: {
          balance: balance.shiftedBy(decimal).toString()
        }
      }
    } catch (e: any) {
      return {
        success: false,
        errMsg: e.message || String(e)
      }
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
    try {
      this.checkInit()
      if (typeof assetType !== 'undefined' && assetType !== HibitIdAssetType.Native && (!contractAddress || !decimalPlaces )) {
        throw new Error('Contract address and decimal is required for non-native assets')
      }
      const chainInfo = hibitIdChainId ? getChainByChainId(ChainId.fromString(hibitIdChainId)) : this._chainInfo
      if (!chainInfo) {
        throw new Error('Chain not supported')
      }
      const chainId = chainInfo.chainId
      const decimal = decimalPlaces ?? chainInfo.nativeAssetDecimals
      const amountBn = new BigNumber(amount).shiftedBy(-decimal)
      const assetInfo: AssetInfo = {
        chainAssetType: assetType ? this.mapAssetType(assetType) : ChainAssetType.Native,
        chain: chainId.type,
        chainNetwork: chainId.network,
        contractAddress: contractAddress || '',
        decimalPlaces: new DecimalPlaces(decimal)
      }
      const txHash = await this._walletPool!.transfer(toAddress, amountBn, assetInfo)
      return {
        success: true,
        data: {
          txHash
        }
      }
    } catch (e: any) {
      return {
        success: false,
        errMsg: e.message || String(e)
      }
    }
  }

  private onRpcDisconnect = async () => {
    console.debug('[wallet on Disconnect]')
    await hibitIdSession.disconnect()
    const oidc = await prOidc
    if (oidc.isUserLoggedIn) {
      sessionStorage.setItem(PASSIVE_DISCONNECT_STORAGE_KEY, Date.now().toString())
      await authManager.logout()
    }
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
    if (!this._walletPool || !this._chainInfo) {
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
