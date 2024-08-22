import { AppRequest, CHAIN, ConnectEvent, ConnectItemReply, ConnectRequest, DeviceInfo, WalletEvent, WalletResponse } from "@tonconnect/protocol";
import { TonConnectBridge, TonConnectCallback, TransactionPayload, WalletInfo } from "./types";
import { HibitIdWallet } from "../wallet";
import { generateEventId, getDeviceInfo, makeConnectErrorEvent, makeTransactionResponseError } from "./utils";
import { HibitIdError, HibitIdWalletOptions, WalletAccount } from "../types";
import { HibitIdChainId, HibitIdErrorCode } from "../enums";
import { Address } from '@ton/ton';

export class TonConnect implements TonConnectBridge {
  callbacks: TonConnectCallback[] = [];

  deviceInfo: DeviceInfo = getDeviceInfo();
  walletInfo: WalletInfo = {
    name: "Hibit ID",
    image: "https://id.hibit.app/logo.png",
    about_url: "https://www.hibit.one/",
  };
  protocolVersion = 2;
  isWalletBrowser = false;

  private network: CHAIN;
  private providerOptions: HibitIdWalletOptions;
  private provider: HibitIdWallet
  private idGenerator = generateEventId()

  constructor(network: CHAIN) {
    this.network = network;
    this.providerOptions = network === CHAIN.MAINNET ? {
      env: 'prod',
      chains: [HibitIdChainId.TonMainnet],
      defaultChain: HibitIdChainId.TonMainnet
    } : {
      env: 'test',
      chains: [HibitIdChainId.TonTestnet],
      defaultChain: HibitIdChainId.TonTestnet
    }
    this.provider = new HibitIdWallet(this.providerOptions);
  }
  
  connect = async (protocolVersion: number, message: ConnectRequest): Promise<ConnectEvent> => {
    const id = this.idGenerator.next().value;

    if (protocolVersion > this.protocolVersion) {
      return makeConnectErrorEvent(id, 1, 'Unsupported protocol version')
    }
    if (message.items.length < 1) {
      return makeConnectErrorEvent(id, 1, 'Invalid request items')
    }
    if (!message.manifestUrl) {
      return makeConnectErrorEvent(id, 2, 'Invalid manifest URL')
    }
    
    try {
      const replyItems: ConnectItemReply[] = []
      let account: WalletAccount | null = null;
      for (const item of message.items) {
        if (item.name ==='ton_proof') {
          // TODO: impl ton_proof
          replyItems.push({
            name: 'ton_proof',
            error: {
              code: 400,
              message: 'Not supported yet'
            }
          })
        } else if (item.name === 'ton_addr') {
          account = account || (await this.provider.connect(this.providerOptions.defaultChain))
          replyItems.push({
            name: 'ton_addr',
            address: account.address,
            network: this.network,
            walletStateInit: '',  // TODO:
            publicKey: account.publicKey || '',
          })
        }
      }
      return {
        event: 'connect',
        id,
        payload: {
          items: replyItems,
          device: this.deviceInfo
        }
      }
    } catch (e) {
      if (e instanceof HibitIdError && e.code === HibitIdErrorCode.USER_CANCEL_CONNECTION) {
        return makeConnectErrorEvent(id, 300, 'User canceled connection')
      }
      return makeConnectErrorEvent(id, 0, (e as any).message || 'Unknown error')
    }
  }

  restoreConnection = async (): Promise<ConnectEvent> => {
    const id = this.idGenerator.next().value;
    try {
      const account = await this.provider.getAccount()
      return {
        event: 'connect',
        id,
        payload: {
          items: [{
            name: 'ton_addr',
            address: account.address,
            network: this.network,
            walletStateInit: '',  // TODO:
            publicKey: account.publicKey || '',
          }],
          device: this.deviceInfo
        }
      }
    } catch (e) {
      if (e instanceof HibitIdError && e.code === HibitIdErrorCode.WALLET_NOT_CONNECTED) {
        return makeConnectErrorEvent(id, 100, 'Can not restore connection')
      }
      return makeConnectErrorEvent(id, 0, (e as any).message || 'Unknown error')
    }
  }

  send = async (message: AppRequest<"sendTransaction" | "signData" | "disconnect">): Promise<WalletResponse<"sendTransaction" | "signData" | "disconnect">> => {
    switch (message.method) {
      case 'sendTransaction': return this.handleSendTransaction(message)
      case 'signData': return this.handleSignData(message)
      case 'disconnect': return this.handleDisconnect(message)
    }
  }

  listen = (callback: (event: WalletEvent) => void): () => void => {
    // TODO:
    return () => {}
  }

  private handleSendTransaction = async (message: AppRequest<'sendTransaction'>): Promise<WalletResponse<'sendTransaction'>> => {
    let payload: TransactionPayload | null = null
    try {
      payload = JSON.parse(message.params[0])
    } catch (e) {
      return makeTransactionResponseError(message.id, 1, 'Invalid transaction payload')
    }
    if (payload?.valid_until && (payload.valid_until * 1000 < Date.now())) {
      return makeTransactionResponseError(message.id, 1, 'Transaction expired')
    }
    if (payload?.network && payload.network !== this.network) {
      return makeTransactionResponseError(message.id, 1, 'Unsupported network')
    }
    const account = await this.provider.getAccount()
    if (payload?.from && Address.parse(account.address).toRawString() !== payload.from) {
      return makeTransactionResponseError(message.id, 1, 'Mismatched sender address')
    }
    if (payload!.messages.length < 1) {
      return makeTransactionResponseError(message.id, 1, 'No messages in transaction')
    }
    
    // TODO: do transaction
  }

  private handleSignData = async (message: AppRequest<'signData'>): Promise<WalletResponse<'signData'>> => {

  }

  private handleDisconnect = async (message: AppRequest<'disconnect'>): Promise<WalletResponse<'disconnect'>> => {
  }
}
