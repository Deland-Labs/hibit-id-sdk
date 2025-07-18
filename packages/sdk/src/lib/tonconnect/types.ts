import {
  DeviceInfo,
  ConnectEvent,
  AppRequest,
  WalletResponse,
  WalletEvent,
  ConnectRequest,
  CHAIN
} from '@tonconnect/protocol';

export interface WalletInfo {
  name: string;
  image: string;
  tondns?: string;
  about_url: string;
}

export type TonConnectCallback = (event: WalletEvent) => void;

export interface TonConnectBridge {
  deviceInfo: DeviceInfo; // see Requests/Responses spec
  walletInfo?: WalletInfo;
  protocolVersion: number; // max supported Ton Connect version (e.g. 2)
  isWalletBrowser: boolean; // if the page is opened into wallet's browser
  connect(
    protocolVersion: number,
    message: ConnectRequest
  ): Promise<ConnectEvent>;
  restoreConnection(): Promise<ConnectEvent>;
  send(
    message: AppRequest<'sendTransaction' | 'signData' | 'disconnect'>
  ): Promise<WalletResponse<'sendTransaction' | 'signData' | 'disconnect'>>;
  listen(callback: (event: WalletEvent) => void): () => void;
}

export interface TonConnectTransactionPayloadMessage {
  address: string; // (string): message destination in user-friendly format
  amount: string; // (decimal string): number of nanocoins to send.
  payload?: string; // (string base64, optional): raw one-cell BoC encoded in Base64.
  stateInit?: string; // (string base64, optional)
}

export interface TonConnectTransactionPayload {
  valid_until?: number; // (integer, optional): unix timestamp. after th moment transaction will be invalid.
  network?: CHAIN; // (NETWORK, optional): The network (mainnet or testnet) where DApp intends to send the transaction. If not set, the transaction is sent to the network currently set in the wallet, but this is not safe and DApp should always strive to set the network. If the network parameter is set, but the wallet has a different network set, the wallet should show an alert and DO NOT ALLOW TO SEND this transaction.
  from?: string; // (string in : format, optional) - The sender address from which DApp intends to send the transaction. If not set, wallet allows user to select the sender's address at the moment of transaction approval. If from parameter is set, the wallet should DO NOT ALLOW user to select the sender's address; If sending from the specified address is impossible, the wallet should show an alert and DO NOT ALLOW TO SEND this transaction.
  messages: TonConnectTransactionPayloadMessage[]; // (array of messages): 1-4 outgoing messages from the wallet contract to other accounts. All messages are sent out in order, however the wallet cannot guarantee that messages will be delivered and executed in same order.
}

export interface TonConnectSignDataPayload {
  schema_crc: number; // (integer): indicates the layout of payload cell that in turn defines domain separation.
  cell: string; // (string, base64 encoded Cell): contains arbitrary data per its TL-B definition.
  publicKey?: string; // (HEX string without 0x, optional): The public key of key pair from which DApp intends to sign the data. If not set, the wallet is not limited in what keypair to sign. If publicKey parameter is set, the wallet SHOULD to sign by keypair corresponding this public key; If sign by this specified keypair is impossible, the wallet should show an alert and DO NOT ALLOW TO SIGN this data.
}

export interface TonConnectSignDataResult {
  signature: string; // base64 encoded signature
  timestamp: string; // UNIX timestamp in seconds (UTC) at the moment on creating the signature.
}
