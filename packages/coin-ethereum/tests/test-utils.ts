/**
 * Test utilities for accessing internal wallet properties
 * This provides type-safe access to internal properties for testing purposes
 */

import { EthereumChainWallet } from '../src/chain-wallet/wallet';

/**
 * Get wallet internals for testing
 * This uses Object property access to bypass TypeScript's private property checks
 */
export function getWalletInternals(wallet: EthereumChainWallet) {
  const w = wallet as any;
  return {
    connectionManager: w.connectionManager as {
      getProvider: (chainInfo?: any) => any;
      cleanup: () => void;
      isInitialized: () => boolean;
      providerCache: { size: number };
      reconnectAttempts: Record<string, number>;
    },
    readyPromise: w.readyPromise as Promise<void>,
    transferImpl: w.transferImpl?.bind(w) as ((params: any) => Promise<string>) | undefined,
    estimateFeeImpl: w.estimateFeeImpl?.bind(w) as ((params: any) => Promise<any>) | undefined
  };
}
