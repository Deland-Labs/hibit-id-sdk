import { Principal } from '@dfinity/principal';
import { IcrcMethods, JsonRpcRequest, JsonRpcResponseError, JsonRpcResponseSuccess } from './types';
import { CHAIN_CONFIG, IC_PROTOCOL } from './config';
import { AccountIdentifier } from '@dfinity/ledger-icp';
import { NetworkError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';

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

export const parseJsonRpcRequest = (data: unknown): JsonRpcRequest => {
  if (typeof data !== 'object' || data === null)
    throw new NetworkError(
      HibitIdSdkErrorCode.INVALID_CONFIGURATION,
      `${CHAIN_CONFIG.CHAIN_NAME}: Invalid JSON-RPC request - malformed data`
    );

  const obj = data as Record<string, unknown>;
  if (obj.jsonrpc !== '2.0')
    throw new NetworkError(
      HibitIdSdkErrorCode.INVALID_CONFIGURATION,
      `${CHAIN_CONFIG.CHAIN_NAME}: Invalid JSON-RPC request - invalid version`
    );
  if (!Object.values(IcrcMethods).includes(obj.method as IcrcMethods))
    throw new NetworkError(
      HibitIdSdkErrorCode.INVALID_CONFIGURATION,
      `${CHAIN_CONFIG.CHAIN_NAME}: Invalid JSON-RPC request - invalid method`
    );

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

/**
 * Check if a principal is a user principal (self-authenticating).
 *
 * Based on IC specification: user principals have 29 bytes (28 hash + 1 type byte).
 * This is different from canister IDs which have exactly 10 bytes.
 *
 * @param principalId - The principal ID to check
 * @returns True if the principal is a user principal (29 bytes with self-auth suffix)
 *
 * @example
 * ```typescript
 * isUserPrincipal('2vxsx-fae'); // false (too short)
 * isUserPrincipal('ryjl3-tyaaa-aaaaa-aaaba-cai'); // false (canister ID, 10 bytes)
 * isUserPrincipal('xkbqi-2qaaa-aaaah-qbpqp-cai'); // true (user principal, 29 bytes)
 * ```
 */
export const isUserPrincipal = (principalId: string): boolean => {
  try {
    const principal = Principal.fromText(principalId);
    const blob = principal.toUint8Array();

    // User principals have exactly 29 bytes (28 hash + 1 type)
    if (blob.length !== IC_PROTOCOL.USER_PRINCIPAL.TOTAL_LENGTH) {
      return false;
    }

    // Last byte should be self-auth type
    return blob[blob.length - 1] === IC_PROTOCOL.USER_PRINCIPAL.TYPE_SELF_AUTH;
  } catch {
    return false;
  }
};

/**
 * Check if a canister ID is valid (different from user principal).
 *
 * Based on IC specification: canister IDs have exactly 10 bytes.
 * User principals have 29 bytes (28 hash + 1 type byte).
 *
 * @param canisterId - The canister ID to check
 * @returns True if the canister ID is valid (exactly 10 bytes)
 *
 * @example
 * ```typescript
 * isValidCanisterId('ryjl3-tyaaa-aaaaa-aaaba-cai'); // true (10 bytes)
 * isValidCanisterId('xkbqi-2qaaa-aaaah-qbpqp-cai'); // false (user principal, 29 bytes)
 * isValidCanisterId('invalid-format'); // false
 * ```
 */
export const isValidCanisterId = (canisterId: string): boolean => {
  try {
    const principal = Principal.fromText(canisterId);
    const blob = principal.toUint8Array();

    // Canister IDs have exactly 10 bytes
    return blob.length === IC_PROTOCOL.CANISTER_ID.LENGTH;
  } catch {
    return false;
  }
};

// Address format enumeration for better type safety
enum AddressFormat {
  PRINCIPAL = 'principal',
  ACCOUNT_IDENTIFIER = 'account_identifier',
  INVALID = 'invalid'
}

/**
 * Determine the format of a Dfinity address.
 *
 * @param address - The address to analyze
 * @returns The format type of the address (Principal, AccountIdentifier, or Invalid)
 *
 * @internal
 */
const getAddressFormat = (address: string): AddressFormat => {
  // Check if it's a valid Principal
  try {
    Principal.fromText(address);
    return AddressFormat.PRINCIPAL;
  } catch {
    // Not a valid Principal, check if it's AccountIdentifier
  }

  // Check if it's a valid AccountIdentifier (64 hex characters)
  const hexRegex = new RegExp(`^[a-fA-F0-9]{${IC_PROTOCOL.ADDRESS_FORMAT.ACCOUNT_IDENTIFIER_HEX_LENGTH}}$`, 'i');
  if (hexRegex.test(address)) {
    return AddressFormat.ACCOUNT_IDENTIFIER;
  }

  return AddressFormat.INVALID;
};

/**
 * Check if an address is a valid Principal.
 *
 * Principals are the primary address format in the Internet Computer.
 * They can be either user principals (29 bytes) or canister IDs (10 bytes).
 *
 * @param address - The address to check
 * @returns True if the address is a valid Principal
 *
 * @example
 * ```typescript
 * isAddressPrincipal('ryjl3-tyaaa-aaaaa-aaaba-cai'); // true
 * isAddressPrincipal('1234567890abcdef...'); // false (AccountIdentifier)
 * ```
 */
export const isAddressPrincipal = (address: string): boolean => {
  return getAddressFormat(address) === AddressFormat.PRINCIPAL;
};

/**
 * Check if an address is a valid AccountIdentifier (64 hex characters).
 *
 * AccountIdentifier is a legacy address format used only for ICP native token.
 * It's a 64-character hexadecimal string. ICRC tokens don't support this format.
 *
 * @param address - The address to check
 * @returns True if the address is a valid AccountIdentifier
 *
 * @example
 * ```typescript
 * isAddressAccountIdentifier('1234567890abcdef...'); // true if 64 hex chars
 * isAddressAccountIdentifier('ryjl3-tyaaa-aaaaa-aaaba-cai'); // false (Principal)
 * ```
 */
export const isAddressAccountIdentifier = (address: string): boolean => {
  return getAddressFormat(address) === AddressFormat.ACCOUNT_IDENTIFIER;
};

/**
 * Check if an address is valid for ICP native token.
 *
 * ICP native token supports both address formats:
 * - Principal: Modern format, recommended
 * - AccountIdentifier: Legacy format, 64 hex characters
 *
 * @param address - The address to check
 * @returns True if the address is valid for ICP native token
 *
 * @example
 * ```typescript
 * isValidIcpNativeAddress('ryjl3-tyaaa-aaaaa-aaaba-cai'); // true (Principal)
 * isValidIcpNativeAddress('1234567890abcdef...'); // true (64 hex chars)
 * ```
 */
export const isValidIcpNativeAddress = (address: string): boolean => {
  const format = getAddressFormat(address);
  return format === AddressFormat.PRINCIPAL || format === AddressFormat.ACCOUNT_IDENTIFIER;
};

/**
 * Check if an address is valid for ICRC tokens.
 *
 * ICRC tokens only support Principal addresses, not AccountIdentifier.
 * This is a key difference from ICP native token.
 *
 * @param address - The address to check
 * @returns True if the address is valid for ICRC tokens (Principal only)
 *
 * @example
 * ```typescript
 * isValidIcrcAddress('ryjl3-tyaaa-aaaaa-aaaba-cai'); // true (Principal)
 * isValidIcrcAddress('1234567890abcdef...'); // false (AccountIdentifier not supported)
 * ```
 */
export const isValidIcrcAddress = (address: string): boolean => {
  return getAddressFormat(address) === AddressFormat.PRINCIPAL;
};

/**
 * Check if an address is valid for Dfinity (general validator).
 *
 * Accepts any valid Dfinity address format:
 * - Principal: Valid for both ICP native and ICRC tokens
 * - AccountIdentifier: Valid only for ICP native token (64 hex chars)
 *
 * @param address - The address to check
 * @returns True if the address is valid in any Dfinity format
 *
 * @example
 * ```typescript
 * isValidDfinityAddress('ryjl3-tyaaa-aaaaa-aaaba-cai'); // true
 * isValidDfinityAddress('1234567890abcdef...'); // true if 64 hex
 * isValidDfinityAddress('invalid'); // false
 * ```
 */
export const isValidDfinityAddress = (address: string): boolean => {
  return isValidIcpNativeAddress(address);
};

/**
 * Get Principal from address (supports both Principal and AccountIdentifier).
 *
 * Note: AccountIdentifier cannot be converted back to Principal due to IC design.
 * This is a one-way transformation.
 *
 * @param address - The address to convert
 * @returns Principal if address is Principal format, null if AccountIdentifier or invalid
 *
 * @example
 * ```typescript
 * getPrincipalFromAddress('ryjl3-tyaaa-aaaaa-aaaba-cai'); // Principal object
 * getPrincipalFromAddress('1234567890abcdef...'); // null (cannot convert)
 * ```
 */
export const getPrincipalFromAddress = (address: string): Principal | null => {
  const format = getAddressFormat(address);

  switch (format) {
    case AddressFormat.PRINCIPAL:
      return Principal.fromText(address);
    case AddressFormat.ACCOUNT_IDENTIFIER:
      // AccountIdentifier cannot be converted back to Principal
      // This is a limitation of the IC design
      return null;
    default:
      return null;
  }
};

/**
 * Get AccountIdentifier from address (supports both Principal and AccountIdentifier).
 *
 * Can convert Principal to AccountIdentifier, or parse existing AccountIdentifier.
 *
 * @param address - The address to convert
 * @returns AccountIdentifier object or null if invalid
 *
 * @example
 * ```typescript
 * getAccountIdentifierByAddress('ryjl3-tyaaa-aaaaa-aaaba-cai'); // Converts Principal
 * getAccountIdentifierByAddress('1234567890abcdef...'); // Parses hex string
 * ```
 */
export const getAccountIdentifierByAddress = (address: string): AccountIdentifier | null => {
  const format = getAddressFormat(address);

  switch (format) {
    case AddressFormat.PRINCIPAL:
      return AccountIdentifier.fromPrincipal({
        principal: Principal.fromText(address)
      });
    case AddressFormat.ACCOUNT_IDENTIFIER:
      return AccountIdentifier.fromHex(address);
    default:
      return null;
  }
};

/**
 * Convert address to Principal (throws if not possible).
 *
 * Use this when you need a Principal and want clear error messages.
 * AccountIdentifier cannot be converted to Principal.
 *
 * @param address - The address to convert
 * @returns Principal object
 * @throws Error if address is AccountIdentifier or invalid
 *
 * @example
 * ```typescript
 * addressToPrincipal('ryjl3-tyaaa-aaaaa-aaaba-cai'); // Principal object
 * addressToPrincipal('1234567890abcdef...'); // throws Error
 * ```
 */
export const addressToPrincipal = (address: string): Principal => {
  const format = getAddressFormat(address);

  switch (format) {
    case AddressFormat.PRINCIPAL:
      return Principal.fromText(address);
    case AddressFormat.ACCOUNT_IDENTIFIER:
      throw new Error(`Cannot convert AccountIdentifier to Principal: ${address}`);
    default:
      throw new Error(`Invalid Dfinity address: ${address}`);
  }
};

/**
 * Convert address to AccountIdentifier (always possible for valid addresses).
 *
 * Any valid address can be converted to AccountIdentifier.
 * Principals are converted, AccountIdentifiers are parsed.
 *
 * @param address - The address to convert
 * @returns AccountIdentifier object
 * @throws Error if address is invalid
 *
 * @example
 * ```typescript
 * addressToAccountIdentifier('ryjl3-tyaaa-aaaaa-aaaba-cai'); // Converts from Principal
 * addressToAccountIdentifier('1234567890abcdef...'); // Parses hex string
 * ```
 */
export const addressToAccountIdentifier = (address: string): AccountIdentifier => {
  const accountId = getAccountIdentifierByAddress(address);
  if (!accountId) {
    throw new Error(`Invalid Dfinity address: ${address}`);
  }
  return accountId;
};
