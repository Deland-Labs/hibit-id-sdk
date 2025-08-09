/**
 * Branded types for type-safe blockchain operations
 */
import { ChainType } from '@delandlabs/hibit-basic-types';

/**
 * Brand utility type - creates a nominal type from a base type
 * @template K - The base type to brand
 * @template T - The brand identifier string
 */
type Brand<K, T> = K & { __brand: T };

/**
 * Branded address type - ensures addresses from different chains cannot be mixed
 * Uses ChainType enum for type safety and IDE support
 *
 * The brand includes the chain type for uniqueness, while runtime functions
 * use ChainType.getName() for user-friendly error messages
 *
 * @example
 * ```typescript
 * import { ChainType } from '@delandlabs/hibit-basic-types';
 *
 * const ethAddress: Address<ChainType.Ethereum> = createAddress('0x...', ChainType.Ethereum);
 * const solAddress: Address<ChainType.Solana> = createAddress('7VQ...', ChainType.Solana);
 *
 * // TypeScript error - cannot mix address types
 * const wrong: Address<ChainType.Ethereum> = solAddress; // ❌ Type error!
 * ```
 */
export type Address<Chain extends ChainType> = Brand<string, `Address_${Chain}`>;

/**
 * Branded private key type - ensures private keys are chain-specific
 */
export type PrivateKey<Chain extends ChainType> = Brand<string, `PrivateKey_${Chain}`>;

/**
 * Branded transaction hash type - ensures transaction hashes are chain-specific
 */
export type TransactionHash<Chain extends ChainType> = Brand<string, `TxHash_${Chain}`>;

/**
 * Branded mnemonic type - ensures mnemonics are explicitly typed
 */
export type Mnemonic = Brand<string, 'Mnemonic'>;

// ============================================================================
// Factory Functions
// ============================================================================

import { ChainValidation } from '../validation/chain-validation';
import { getChainName } from '../utils/chain-helpers';

/**
 * Create a branded address with validation using ChainType enum for type safety and IDE support
 *
 * @param value - The address string
 * @param chainType - The chain type enum
 * @returns A branded address
 * @throws Error if the address is invalid or validator not registered
 *
 * @example
 * ```typescript
 * import { ChainType } from '@delandlabs/hibit-basic-types';
 *
 * const ethAddress = createAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f6E8e0', ChainType.Ethereum);
 * const solAddress = createAddress('7VQo3HFLNH5QqGtM8eC3GQjkbpzaa8CxyfMSr2JH1eFi', ChainType.Solana);
 * ```
 */
export function createAddress<C extends ChainType>(value: string, chainType: C): Address<C> {
  if (!ChainValidation.hasValidator(chainType)) {
    const chainName = getChainName(chainType);
    throw new Error(
      `No address validator registered for chain: ${chainName} (${chainType}). ` +
        `Please ensure the ${chainName} wallet module is imported before creating addresses.`
    );
  }
  if (!ChainValidation.isValidWalletAddress(value, chainType)) {
    const chainName = getChainName(chainType);
    throw new Error(`Invalid ${chainName} address: ${value}`);
  }
  return value as Address<C>;
}

/**
 * Type guard for branded addresses
 * @param value - The value to check
 * @param chainType - The chain type enum
 * @returns True if the value is a valid address for the chain
 */
export function isAddress<C extends ChainType>(value: unknown, chainType: C): value is Address<C> {
  return typeof value === 'string' && ChainValidation.isValidWalletAddress(value, chainType);
}

/**
 * Create a branded address with async validation (supports lazy loading)
 * @param value - The address string
 * @param chainType - The chain type enum
 * @returns A promise that resolves to a branded address
 * @throws Error if the address is invalid or validator not found
 */
export function createAddressAsync<C extends ChainType>(value: string, chainType: C): Promise<Address<C>> {
  const isValid = ChainValidation.isValidWalletAddress(value, chainType);
  if (!isValid) {
    const chainName = getChainName(chainType);
    throw new Error(`Invalid ${chainName} address: ${value}`);
  }
  return Promise.resolve(value as Address<C>);
}

/**
 * Type guard to check if a value is a valid address (async version)
 * @param value - The value to check
 * @param chainType - The chain type enum
 * @returns Promise that resolves to true if the value is a valid address
 */
export async function isAddressAsync<C extends ChainType>(value: unknown, chainType: C): Promise<boolean> {
  if (typeof value !== 'string') return false;
  try {
    await createAddressAsync(value, chainType);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a branded transaction hash (no validation as format varies greatly)
 * @param value - The transaction hash string
 * @param chainType - The chain type enum
 * @returns A branded transaction hash
 * @throws {Error} If the transaction hash is invalid
 */
export function createTransactionHash<C extends ChainType>(value: string, chainType: C): TransactionHash<C> {
  if (!value || typeof value !== 'string') {
    const chainName = getChainName(chainType);
    throw new Error(`Invalid transaction hash for ${chainName}`);
  }
  return value as TransactionHash<C>;
}

/**
 * Create a branded mnemonic
 * @param value - The mnemonic phrase
 * @returns A branded mnemonic
 * @throws {Error} If the mnemonic is invalid
 */
export function createMnemonic(value: string): Mnemonic {
  if (!value || typeof value !== 'string') {
    throw new Error('Invalid mnemonic');
  }
  return value as Mnemonic;
}

/**
 * Create a branded private key
 * @param value - The private key string
 * @param chainType - The chain type enum
 * @returns A branded private key
 * @throws {Error} If the private key is invalid
 */
export function createPrivateKey<C extends ChainType>(value: string, chainType: C): PrivateKey<C> {
  if (!value || typeof value !== 'string') {
    const chainName = getChainName(chainType);
    throw new Error(`Invalid private key for ${chainName}`);
  }
  return value as PrivateKey<C>;
}
