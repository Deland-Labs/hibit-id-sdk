import { expect, test } from 'vitest';
import { EthereumChainWallet } from '../src/chain-wallet/wallet';
import { Ethereum } from './test-chains';
import { getWalletInternals } from './test-utils';

const testMnemonic = 'test test test test test test test test test test test junk';

test('should use ConnectionManager for provider caching', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);

  // Wait for initialization
  await wallet.getAccount();

  // Access the connectionManager through private property
  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;
  const providerCache = connectionManager.providerCache;

  // Get provider for the first time - should create and cache it
  const provider1 = connectionManager.getProvider();
  expect(providerCache.size).toBe(1);

  // Get provider multiple times - should use cache
  const provider2 = connectionManager.getProvider();

  expect(provider1).toBe(provider2); // Same instance from cache
  expect(providerCache.size).toBe(1); // Still only one entry

  wallet.destroy();
});

test('should properly clean up provider cache on dispose', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  await wallet.getAccount();

  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;
  const providerCache = connectionManager.providerCache;

  // Create a provider to ensure cache has data
  connectionManager.getProvider();

  // Verify data exists
  expect(providerCache.size).toBeGreaterThan(0);

  // Dispose should clear everything
  wallet.destroy();

  // Provider cache should be cleared
  expect(providerCache.size).toBe(0);
});
