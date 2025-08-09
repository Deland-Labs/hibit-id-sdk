/** SDK exposed RPC methods - called by wallet to notify SDK */
export const SdkExposeRPCMethod = {
  /** Close iframe modal window */
  IFRAME_CLOSE: 'iframeClose',
  /** Notify wallet connection status */
  CONNECTED: 'connected',
  /** Notify wallet disconnection */
  DISCONNECTED: 'disconnected',
  /** Notify iframe is ready for communication */
  IFRAME_READY: 'iframeReady',
  /** Notify login state change */
  LOGIN_CHANGED: 'loginChanged',
  /** Notify password change completion */
  PASSWORD_CHANGED: 'passwordChanged'
} as const;

export type SdkExposeRPCMethodType = typeof SdkExposeRPCMethod[keyof typeof SdkExposeRPCMethod];

/** Wallet exposed RPC methods - called by SDK to interact with wallet */
export const WalletExposeRPCMethod = {
  /** Get account for specific chain */
  GET_ACCOUNT: 'getAccount',
  /** Get accounts for multiple chains */
  GET_ACCOUNTS: 'getAccounts',
  /** Connect to wallet */
  CONNECT: 'connect',
  /** Get balance */
  GET_BALANCE: 'getBalance',
  /** Transfer assets */
  TRANSFER: 'transfer',
  /** Get estimated transaction fee */
  GET_ESTIMATED_FEE: 'getEstimatedFee',
  /** Disconnect from wallet */
  DISCONNECT: 'disconnect',
  /** Sign message */
  SIGN_MESSAGE: 'signMessage',
  /** Set background embed mode */
  SET_BACKGROUND_EMBED: 'setBackgroundEmbed',
  /** Show change password dialog */
  SHOW_CHANGE_PASSWORD: 'showChangePassword',
  /** Verify password */
  VERIFY_PASSWORD: 'verifyPassword',
  /** Get asset decimals */
  GET_ASSET_DECIMALS: 'getAssetDecimals'
} as const;

export type WalletExposeRPCMethodType = typeof WalletExposeRPCMethod[keyof typeof WalletExposeRPCMethod];

// TODO: grow this list
export enum AuthenticatorType {
  Telegram = 'Telegram',
  Google = 'Google',
  // Facebook = 'Facebook',
  // Apple = 'Apple',
  X = 'X'
  // Add more authenticators here
}