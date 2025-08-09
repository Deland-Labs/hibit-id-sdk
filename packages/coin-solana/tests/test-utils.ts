import { vi } from 'vitest';
import { ILogger, ChainInfo } from '@delandlabs/coin-base';
import { ChainType, ChainId } from '@delandlabs/hibit-basic-types';

export function createMockLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn()
    })
  };
}

export function createSolanaAddress(address: string): any {
  return address as any; // Type assertion for test purposes
}

// For tests that need recipientAddress
export function createMockTransferParams(recipientAddress: string, amount: string) {
  return {
    recipientAddress: createSolanaAddress(recipientAddress),
    amount: new (require('bignumber.js'))(amount),
    token: { assetType: 'Native' as any }
  };
}

export function createMockBalanceParams(address: string, tokenAddress?: string) {
  return {
    address: createSolanaAddress(address),
    token: tokenAddress ? { assetType: 'SPL' as any, tokenAddress } : { assetType: 'Native' as any }
  };
}

export function createMockChainInfo(): ChainInfo {
  return {
    chainId: new ChainId(ChainType.Solana, 'mainnet' as any),
    name: 'Solana',
    fullName: 'Solana Mainnet',
    icon: 'solana-icon',
    nativeAssetSymbol: 'SOL',
    supportedSignaturesSchemas: [] as any,
    explorer: 'https://solscan.io',
    rpc: {
      primary: 'https://api.mainnet-beta.solana.com'
    },
    isMainnet: true,
    isNativeGas: true,
    ecosystem: 'Solana' as any
  };
}

export function createMockConnection() {
  return {
    getBalance: vi.fn(),
    getFeeForMessage: vi.fn(),
    getMinimumBalanceForRentExemption: vi.fn(),
    simulateTransaction: vi.fn()
  };
}

export function createMockKeypair() {
  return {
    publicKey: {
      toBase58: () => 'test-public-key',
      toBytes: () => new Uint8Array(32)
    },
    secretKey: new Uint8Array(64)
  };
}
