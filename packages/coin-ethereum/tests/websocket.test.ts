import { expect, test, vi, afterEach } from 'vitest';
import { EthereumChainWallet } from '../src/chain-wallet/wallet';
import { WebSocketProvider, JsonRpcProvider } from 'ethers';
import { ChainId, ChainType, ChainNetwork, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import { Ecosystem } from '@delandlabs/coin-base';
import { getWalletInternals } from './test-utils';

const testMnemonic = 'test test test test test test test test test test test junk';
const walletsToCleanup: EthereumChainWallet[] = [];

// Cleanup wallets after each test
afterEach(() => {
  walletsToCleanup.forEach((wallet) => {
    try {
      wallet.destroy();
    } catch (e) {
      // Ignore cleanup errors
    }
  });
  walletsToCleanup.length = 0;
});

// Helper to create wallet and track for cleanup
function createTestWallet(chainInfo: any, mnemonic = testMnemonic): EthereumChainWallet {
  const wallet = new EthereumChainWallet(chainInfo, mnemonic);
  walletsToCleanup.push(wallet);
  // Catch initialization errors
  const internals = getWalletInternals(wallet);
  internals.readyPromise.catch(() => {});
  return wallet;
}

// Mock WebSocket chain configuration
const WebSocketChain = {
  chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumMainNet),
  name: 'Ethereum',
  fullName: 'Ethereum Mainnet',
  icon: '/chain-icons/Ethereum.svg',
  nativeAssetSymbol: 'ETH',
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
  explorer: 'https://etherscan.io',
  rpc: {
    primary: 'https://mainnet.infura.io',
    webSocket: 'wss://mainnet.infura.io/ws'
  }
};

// HTTP-only chain configuration
const HttpOnlyChain = {
  chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumMainNet),
  name: 'Ethereum',
  fullName: 'Ethereum Mainnet',
  icon: '/chain-icons/Ethereum.svg',
  nativeAssetSymbol: 'ETH',
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  isMainnet: true,
  isNativeGas: true,
  ecosystem: Ecosystem.EVM,
  explorer: 'https://etherscan.io',
  rpc: {
    primary: 'https://mainnet.infura.io'
    // No webSocket property
  }
};

test('should use WebSocket provider when available', async () => {
  const wallet = createTestWallet(WebSocketChain);

  // Wait for initialization
  await wallet.getAccount();

  // Access the connectionManager
  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;
  const provider = connectionManager.getProvider();

  // When WebSocket URL is configured, should use WebSocketProvider
  expect(provider).toBeInstanceOf(WebSocketProvider);
});

test('should fallback to HTTP provider when WebSocket not configured', async () => {
  const wallet = createTestWallet(HttpOnlyChain);

  // Wait for initialization
  await wallet.getAccount();

  // Access the connectionManager
  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;
  const provider = connectionManager.getProvider();

  // When no WebSocket URL, should use JsonRpcProvider
  expect(provider).toBeInstanceOf(JsonRpcProvider);
});

test('should handle WebSocket connection lifecycle', async () => {
  const wallet = createTestWallet(WebSocketChain);

  // Wait for initialization
  await wallet.getAccount();

  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;
  const provider = connectionManager.getProvider();

  // Verify WebSocket provider is created
  expect(provider).toBeInstanceOf(WebSocketProvider);

  // Check that ping interval is set up
  const providerInternal = provider as any;
  expect(providerInternal._pingInterval).toBeDefined();

  // Dispose should clean up
  wallet.destroy();

  // After disposal, provider cache should be cleared
  const providerCache = connectionManager.providerCache;
  expect(providerCache.size).toBe(0);
});

test('should handle provider caching correctly', async () => {
  const wallet = createTestWallet(WebSocketChain);

  await wallet.getAccount();

  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;

  // Get provider multiple times
  const provider1 = connectionManager.getProvider();
  const provider2 = connectionManager.getProvider();
  const provider3 = connectionManager.getProvider();

  // Should return the same cached instance
  expect(provider1).toBe(provider2);
  expect(provider2).toBe(provider3);

  // Cache should have only one entry
  const providerCache = connectionManager.providerCache;
  expect(providerCache.size).toBe(1);
});

test('should support multiple chain configurations', async () => {
  // Create wallet with WebSocket chain
  const wallet = createTestWallet(WebSocketChain);
  await wallet.getAccount();

  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;

  // Get provider for default chain
  const provider1 = connectionManager.getProvider();
  expect(provider1).toBeInstanceOf(WebSocketProvider);

  // Create a different chain config
  const differentChain = {
    ...HttpOnlyChain,
    chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
    name: 'Sepolia',
    rpc: { primary: 'https://sepolia.infura.io' }
  };

  // Get provider for different chain
  const provider2 = connectionManager.getProvider(differentChain);
  expect(provider2).toBeInstanceOf(JsonRpcProvider);

  // Should have two cached providers
  const providerCache = connectionManager.providerCache;
  expect(providerCache.size).toBe(2);
});

test('should clean up WebSocket resources on disposal', async () => {
  const wallet = createTestWallet(WebSocketChain);
  await wallet.getAccount();

  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;
  const provider = connectionManager.getProvider() as WebSocketProvider;

  // Mock the destroy method
  vi.spyOn(provider, 'destroy').mockImplementation(async () => {});

  // Get the ping interval reference
  const providerInternal = provider as any;
  const pingInterval = providerInternal._pingInterval;
  expect(pingInterval).toBeDefined();

  // Dispose the wallet
  wallet.destroy();

  // Provider cache should be cleared (which triggers disposal)
  const providerCache = connectionManager.providerCache;
  expect(providerCache.size).toBe(0);

  // Note: The actual cleanup happens in the LRU cache disposal callback
});

test('should handle reconnection state correctly', async () => {
  const wallet = createTestWallet(WebSocketChain);
  await wallet.getAccount();

  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;

  // Access reconnection attempts tracking
  const reconnectAttempts = connectionManager.reconnectAttempts;

  // Initially should be empty
  expect(Object.keys(reconnectAttempts).length).toBe(0);

  // Simulate a reconnection scenario by manually setting attempts
  const key = `${WebSocketChain.chainId.chain}_${WebSocketChain.chainId.network}`;
  reconnectAttempts[key] = 3;

  // After cleanup, attempts should be reset
  connectionManager.cleanup();
  expect(Object.keys(reconnectAttempts).length).toBe(0);
});

test('should validate connection manager initialization', async () => {
  const wallet = createTestWallet(WebSocketChain);

  // Before initialization, should not be ready
  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;
  expect(connectionManager.isInitialized()).toBe(false);

  // After initialization
  await wallet.getAccount();
  expect(connectionManager.isInitialized()).toBe(true);

  // After cleanup
  connectionManager.cleanup();
  expect(connectionManager.isInitialized()).toBe(false);
});
