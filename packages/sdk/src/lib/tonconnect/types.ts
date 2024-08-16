import { DeviceInfo, ConnectEvent, AppRequest, WalletResponse, WalletEvent, ConnectRequest } from "@tonconnect/protocol";

export interface WalletInfo {
  name: string;
  image: string;
  tondns?:  string;
  about_url: string;
}

export type TonConnectCallback = (event: WalletEvent) => void;

export interface TonConnectBridge {
  deviceInfo: DeviceInfo; // see Requests/Responses spec
  walletInfo?: WalletInfo;
  protocolVersion: number; // max supported Ton Connect version (e.g. 2)
  isWalletBrowser: boolean; // if the page is opened into wallet's browser
  connect(protocolVersion: number, message: ConnectRequest): Promise<ConnectEvent>;
  restoreConnection(): Promise<ConnectEvent>;
  send(message: AppRequest<'sendTransaction' | 'signData' | 'disconnect'>): Promise<WalletResponse<'sendTransaction' | 'signData' | 'disconnect'>>;
  listen(callback: (event: WalletEvent) => void): () => void;
}
