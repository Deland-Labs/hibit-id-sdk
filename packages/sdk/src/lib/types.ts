import {
  MnemonicError,
  ChainInfo,
  HibitIdSdkErrorCode
} from '@delandlabs/coin-base';
import {
  ChainAccount,
  ChainId,
  ChainAssetType
} from '@delandlabs/hibit-basic-types';
import { AuthenticatorType } from './enums';

// Re-export MnemonicError from coin-base for consistency
export { MnemonicError };

/**
 * Describes a ChainAccount with additional state provided by the wallet.
 */
export interface ChainAccountInfo {
  /**
   * Core account information (includes address, publicKey, and chainId).
   */
  account: ChainAccount;

  /**
   * Whether this is the user's primary account set in the wallet.
   * Only one account in the returned list will have this as true.
   */
  isPrimary: boolean;

  /**
   * Whether the wallet functionality for this chain is currently available.
   * dApps should only interact with accounts where isActive is true.
   */
  isActive: boolean;
}

export type HibitEnv = 'dev' | 'test' | 'prod';

export type Language = 'en' | 'cnt' | 'ja' | 'ru';
// whether to fix the dev mode to 'off' or 'on'
export type FixDevMode = 'on' | 'off' | 'unset';
// float: show the wallet in a floating window with controller button
// background: make wallet invisible most of the time except login process and password reset, only controllable through SDK
// default to 'float'
export type EmbedMode = 'float' | 'background';

export interface HibitIdWalletOptions {
  env: HibitEnv;
  chains: ChainId[];
  defaultChain: ChainId;
  lang?: Language;
  fixDevMode?: FixDevMode;
  iframeUrlAppendix?: string;
  embedMode?: EmbedMode;
  controllerDefaultPosition?: { right: number; bottom: number };
}

export interface HibitIdAuth {
  token: string;
  expiresAt: number;
}

export interface BalanceChangeData {
  request: GetBalanceRequest;
  balance: string;
  lastBalance: string | null;
}

// Note: In SDK V2, chainChanged and accountsChanged events are removed
// as the SDK becomes stateless. dApps should call getAccounts() or getAccount() as needed.

export class BridgePromise<T> {
  public promise: Promise<T>;
  public resolve: (value: T) => void = () => {};
  public reject: (reason?: string) => void = () => {};

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export class HibitIdError extends Error {
  constructor(
    public code: HibitIdSdkErrorCode,
    message: string
  ) {
    super(message);
  }
}

export interface AuthParty {
  key: string;
  name: string;
  icon: string;
}

export type RpcBaseResponse<T> =
  | {
      success: false;
      errMsg: string;
    }
  | {
      success: true;
      data: T;
    };

export interface ConnectRequest {
  authType?: AuthenticatorType;
}

export interface SignMessageRequest {
  message: string;
  chainId: ChainId;
}

export type SignMessageResponse = RpcBaseResponse<{
  signature: string;
}>;

export interface GetBalanceRequest {
  assetType?: ChainAssetType;
  chainId: ChainId;
  contractAddress?: string;
}

export type GetBalanceResponse = RpcBaseResponse<{
  balance: string; // in minimal unit (like wei for eth)
}>;

export interface GetAssetDecimalsRequest {
  chainId: ChainId;
  token: {
    assetType: ChainAssetType;
    tokenAddress?: string;
    symbol?: string;
  };
}

export type GetAssetDecimalsResponse = RpcBaseResponse<{
  decimals: number;
}>;

export interface TransferRequest {
  recipientAddress: string;
  amount: string; // in minimal unit (like wei for eth)
  assetType?: ChainAssetType;
  chainId: ChainId;
  contractAddress?: string;
  payload?: string;
}

export type TransferResponse = RpcBaseResponse<{
  txHash: string;
}>;

export type GetEstimatedFeeRequest = TransferRequest;

export type GetEstimatedFeeResponse = RpcBaseResponse<{
  fee: string; // in minimal unit (like wei for eth)
}>;

export interface VerifyPasswordRequest {
  password: string;
}

export type VerifyPasswordResponse = RpcBaseResponse<null>;

export type GetAccountRequest = {
  chainId: ChainId;
};

export type GetAccountResponse = RpcBaseResponse<ChainAccount>;

// New request/response types for getAccounts() method
export interface GetAccountsRequest {}

export type GetAccountsResponse = RpcBaseResponse<{
  accounts: ChainAccountInfo[];
}>;

export type GetChainInfoResponse = RpcBaseResponse<{
  chainInfo: ChainInfo;
}>;

export interface PasswordChangeNotification {
  success: boolean;
}

export interface LoginStateChangeNotification {
  isLogin: boolean;
  sub?: string; // required if isLogin is true
}

export interface UpdateEmbedModeRequest {
  value: boolean;
}
