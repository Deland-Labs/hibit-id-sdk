import { Principal } from '@dfinity/principal';
import {
  IcrcMethods,
  IcrcPermissionState,
  JsonRpcRequest,
  JsonRpcResponseError,
  JsonRpcResponseSuccess
} from './types';
import { AccountIdentifier } from '@dfinity/ledger-icp';

const ICRC_SESSION_KEY = 'icrc29_session';

type Icrc29Session = {
  establishedOrigin: string;
  permissions: Record<string, IcrcPermissionState>;
};

// TODO: grow as implement more standards
export const SUPPORTED_STANDARDS = [
  {
    name: 'ICRC-25',
    url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-25/ICRC-25.md'
  },
  {
    name: 'ICRC-27',
    url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-27/ICRC-27.md'
  },
  {
    name: 'ICRC-29',
    url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-29/ICRC-29.md'
  },
  {
    name: 'ICRC-32',
    url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-32/ICRC-32.md'
  },
  {
    name: 'ICRC-49',
    url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-49/ICRC-49.md'
  }
];

export const NEED_PERMISSION_METHODS = [
  IcrcMethods.ICRC27_ACCOUNTS,
  IcrcMethods.ICRC32_SIGN_CHALLENGE,
  IcrcMethods.ICRC49_CALL_CANISTER
];

export const getIcrc29Session = (): Icrc29Session | null => {
  const session = sessionStorage.getItem(ICRC_SESSION_KEY);
  if (!session) return null;
  return JSON.parse(session) as Icrc29Session;
};

export const setIcrc29Session = (origin: string, permissions: Icrc29Session['permissions']) => {
  sessionStorage.setItem(
    ICRC_SESSION_KEY,
    JSON.stringify({
      establishedOrigin: origin,
      permissions
    } as Icrc29Session)
  );
};

export const parseJsonRpcRequest = (data: any): JsonRpcRequest => {
  if (typeof data !== 'object') throw new Error('Invalid JSON-RPC request: malformed data');
  if (data.jsonrpc !== '2.0') throw new Error('Invalid JSON-RPC request: invalid version');
  if (!Object.values(IcrcMethods).includes(data.method)) throw new Error('Invalid JSON-RPC request: invalid method');
  return data as JsonRpcRequest;
};

export const buildJsonRpcResponse = <TResult>(id: number, result: TResult): JsonRpcResponseSuccess<TResult> => {
  return {
    id,
    jsonrpc: '2.0',
    result
  };
};

export const buildJsonRpcError = (id: number, code: number, message: string, desc?: string): JsonRpcResponseError => {
  return {
    id,
    jsonrpc: '2.0',
    error: {
      code,
      message,
      description: desc
    }
  };
};

export const isAddressPrincipal = (address: string): boolean => {
  try {
    Principal.fromText(address);
    return true;
  } catch (e) {
    return false;
  }
};

export const isAddressAccountIdentifier = (address: string): boolean => {
  return /^[a-fA-F0-9]{64}$/i.test(address);
};

export const getAccountIdentifierByAddress = (address: string): AccountIdentifier | null => {
  if (isAddressPrincipal(address)) {
    return AccountIdentifier.fromPrincipal({
      principal: Principal.fromText(address)
    });
  }
  if (isAddressAccountIdentifier(address)) {
    return AccountIdentifier.fromHex(address);
  }
  return null;
};
