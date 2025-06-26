export enum IcrcMethods {
  // ICRC-25
  ICRC25_REQUEST_PERMISSIONS = 'icrc25_request_permissions',
  ICRC25_PERMISSIONS = 'icrc25_permissions',
  ICRC25_SUPPORTED_STANDARDS = 'icrc25_supported_standards',
  // ICRC-27
  ICRC27_ACCOUNTS = 'icrc27_accounts',
  // ICRC-29
  ICRC29_STATUS = 'icrc29_status',
  // ICRC-32
  ICRC32_SIGN_CHALLENGE = 'icrc32_sign_challenge',
  // ICRC-49
  ICRC49_CALL_CANISTER = 'icrc49_call_canister'
}

export enum IcrcPermissionState {
  GRANTED = 'granted',
  DENIED = 'denied',
  ASK_ON_USE = 'ask_on_use'
}

export enum IcrcErrorCode {
  GenericError = 1000,
  NotSupported = 2000,
  PermissionNotGranted = 3000,
  ActionAborted = 3001,
  NetworkError = 4000,
  TransportChannelClosed = 4001,
}

export const IcrcErrorCodeMessages: Record<IcrcErrorCode, string> = {
  [IcrcErrorCode.GenericError]: 'Generic error',
  [IcrcErrorCode.NotSupported]: 'Not supported',
  [IcrcErrorCode.PermissionNotGranted]: 'Permission not granted',
  [IcrcErrorCode.ActionAborted]: 'Action aborted',
  [IcrcErrorCode.NetworkError]: 'Network error',
  [IcrcErrorCode.TransportChannelClosed]: 'Transport channel closed',
}

export type JsonRpcRequest = {
  id: number;
  jsonrpc: '2.0';
  method: IcrcMethods;
  params?: unknown[];
};

export type JsonRpcResponseSuccess<TResult> = {
  id: number;
  jsonrpc: '2.0';
  result: TResult
};

export type JsonRpcResponseError = {
  id: number;
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    description?: string;
  };
};

export type Icrc25RequestPermissionsRequest = JsonRpcRequest & {
  method: IcrcMethods.ICRC25_REQUEST_PERMISSIONS;
  params: {
    scopes: Array<{ method: IcrcMethods }>;
  };
};

export type Icrc25RequestPermissionsResult = {
  scopes: Array<{
    scope: {
      method: IcrcMethods;
    };
    state: IcrcPermissionState
  }>;
};

export type Icrc25PermissionsRequest = JsonRpcRequest & {
  method: IcrcMethods.ICRC25_PERMISSIONS;
  params: undefined
};

export type Icrc25PermissionsResult = Icrc25RequestPermissionsResult

export type Icrc25SupportedStandardsRequest = JsonRpcRequest & {
  method: IcrcMethods.ICRC25_SUPPORTED_STANDARDS;
  params: undefined
};

export type Icrc25SupportedStandardsResult = {
  supportedStandards: Array<{
    name: string,
    url: string
  }>;
};

export type Icrc27AccountsRequest = JsonRpcRequest & {
  method: IcrcMethods.ICRC27_ACCOUNTS;
  params: undefined
};

export type Icrc27AccountsResult = {
  accounts: Array<{
    owner: string
    subaccount?: string
  }>;
};

export type Icrc29StatusRequest = JsonRpcRequest & {
  method: IcrcMethods.ICRC29_STATUS;
  params: undefined
};

export type Icrc29StatusResult = "ready"

export type Icrc32SignChallengeRequest = JsonRpcRequest & {
  method: IcrcMethods.ICRC32_SIGN_CHALLENGE;
  params: {
    principal: string
    challenge: string // base64 encoded
  }
};

export type Icrc32SignChallengeResult = {
  publicKey: string
  signature: string
};

export type Icrc49CallCanisterRequest = JsonRpcRequest & {
  method: IcrcMethods.ICRC49_CALL_CANISTER
  params: {
    canisterId: string
    sender: string
    method: string
    arg: string // base64 encoded
    nonce?: string // base64 encoded
  }
}

export type Icrc49CallCanisterResult = {
  contentMap: string  // base64 encoded
  certificate: string // base64 encoded
}
