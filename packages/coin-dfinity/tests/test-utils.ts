import { createAddress, ChainValidation } from '@delandlabs/coin-base';
import { ChainAssetType, ChainType } from '@delandlabs/hibit-basic-types';
import { IC_CANISTERS } from '../src/chain-wallet/config';

// Function to ensure validator is registered lazily
function ensureValidatorRegistered() {
  if (!ChainValidation.hasValidator(ChainType.Dfinity)) {
    // Use a simple validator directly to avoid decorator issues during testing
    const validator = {
      validateWalletAddress: (address: string): boolean => {
        if (!address || typeof address !== 'string') return false;
        const trimmed = address.trim();
        if (!trimmed) return false;

        // Check Principal format (basic check)
        if (trimmed.includes('-') && trimmed.includes('cai')) return true;

        // Check AccountIdentifier format (64 hex characters)
        return trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed);
      },
      validateTokenAddress: (tokenAddress: string): boolean => {
        if (!tokenAddress || typeof tokenAddress !== 'string') return false;
        const trimmed = tokenAddress.trim();
        if (!trimmed) return false;

        // Check Principal format (basic check)
        return trimmed.includes('-') && trimmed.includes('cai');
      }
    };
    ChainValidation.register(ChainType.Dfinity, validator);
  }
}

/**
 * Create a branded Dfinity address for testing
 */
export function createDfinityAddress(address: string) {
  ensureValidatorRegistered();
  return createAddress(address, ChainType.Dfinity);
}

/**
 * Create a complete native token for testing
 */
export function createNativeToken() {
  return {
    assetType: ChainAssetType.ICP,
    symbol: 'ICP'
  };
}

/**
 * Create a complete ICRC token for testing
 */
export function createIcrcToken(tokenAddress: string) {
  return {
    assetType: ChainAssetType.ICRC3,
    symbol: 'ICRC',
    tokenAddress
  };
}

/**
 * Valid test addresses (Principal format)
 * These are real canister IDs from IC mainnet that have exactly 10 bytes
 */
export const TEST_ADDRESSES = {
  VALID_PRINCIPAL_1: IC_CANISTERS.ICP_LEDGER, // ICP Ledger (10 bytes)
  VALID_PRINCIPAL_2: 'rdmx6-jaaaa-aaaaa-aaadq-cai', // ICP Index (10 bytes)
  VALID_CANISTER_1: 'rrkah-fqaaa-aaaaa-aaaaq-cai', // Governance (10 bytes)
  VALID_CANISTER_2: 'be2us-64aaa-aaaaa-qaabq-cai', // ckBTC (10 bytes)
  MANAGEMENT_CANISTER: 'aaaaa-aa', // Management canister
  SHORT_FORMAT: '2chl6-4hpzw-vqaaa-aaaaa-c' // User principal (29 bytes)
} as const;

/**
 * Invalid test addresses for validation
 */
export const INVALID_ADDRESSES = {
  EMPTY: '',
  INVALID_FORMAT: 'invalid-principal',
  ETHEREUM: '0x1234567890abcdef',
  TON: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqr',
  BITCOIN: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  WITH_SPACES: 'invalid format with spaces'
} as const;

/**
 * Generate a valid canister ID for testing
 * The format ensures it's a valid Principal with 10 bytes (canister ID length)
 */
export function generateTestCanisterId(index: number): string {
  // These are valid test canister IDs that pass Principal validation
  // All are real canister IDs from the IC mainnet with exactly 10 bytes
  const testCanisterIds = [
    IC_CANISTERS.ICP_LEDGER, // ICP Ledger (10 bytes)
    'rdmx6-jaaaa-aaaaa-aaadq-cai', // ICP Index (10 bytes)
    'rrkah-fqaaa-aaaaa-aaaaq-cai', // Governance (10 bytes)
    'be2us-64aaa-aaaaa-qaabq-cai', // ckBTC Ledger (10 bytes)
    'mxzaz-hqaaa-aaaar-qaada-cai', // ckETH Ledger (10 bytes)
    'n5wcd-faaaa-aaaar-qaaea-cai', // ICRC Index (10 bytes)
    'renrk-eyaaa-aaaaa-aaada-cai', // II Frontend (10 bytes)
    'qoctq-giaaa-aaaaa-aaaea-cai' // NNS Governance (10 bytes)
  ];

  // Cycle through the list if index is larger
  return testCanisterIds[index % testCanisterIds.length];
}
