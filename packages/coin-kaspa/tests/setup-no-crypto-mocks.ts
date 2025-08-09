import { vi } from 'vitest';

// Mock import.meta.env for tests
(globalThis as any).importMetaEnv = {
  VITE_HIBIT_KASPA_MAINNET_ENDPOINT: 'https://api.kaspa.org',
  VITE_HIBIT_KASPA_TESTNET_ENDPOINT: 'https://api-tn10.kaspa.org'
};

// Mock import.meta
(globalThis as any).import = {
  meta: {
    env: (globalThis as any).importMetaEnv
  }
};

// Mock UTXO data structure for network operations
const mockUtxos = [
  {
    txId: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    index: 0,
    amount: 100000000n, // 1 KAS in sompi (smallest unit)
    scriptPublicKey: '76a914' + '0'.repeat(40) + '88ac',
    isCoinbase: false,
    blockDaaScore: 1000000
  }
];

// Create mock websocket client for network operations only
const createMockWebSocketClient = () => {
  const eventHandlers = new Map();

  return {
    // Connection methods
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),

    // Event handling
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      eventHandlers.delete(event);
    }),

    // UTXO subscription (network operation)
    subscribeUtxosChanged: vi.fn().mockImplementation((addresses: string[]) => {
      console.log(`[KASPA subscribed utxo] ${addresses.join(', ')}`);
      return Promise.resolve();
    }),

    unsubscribeUtxosChanged: vi.fn().mockResolvedValue(undefined),

    // Network RPC calls
    sendRpcRequest: vi.fn().mockImplementation((method: string, _params: any) => {
      switch (method) {
        case 'getUtxosByAddresses':
          return Promise.resolve({ entries: mockUtxos });
        case 'submitTransaction':
          return Promise.resolve({
            txId: 'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc'
          });
        case 'getBlockDagInfo':
          return Promise.resolve({
            networkName: 'kaspa-mainnet',
            blockCount: 1000000,
            virtualDaaScore: 1000000
          });
        default:
          return Promise.resolve({});
      }
    })
  };
};

// Only mock network-related parts of kaspa-web3.js, let crypto functions run natively
vi.mock('@kcoin/kaspa-web3.js', async () => {
  const actual = (await vi.importActual('@kcoin/kaspa-web3.js')) as Record<string, any>;

  return {
    ...actual,
    // Only mock network client
    KaspaWebSocketClient: vi.fn().mockImplementation(() => createMockWebSocketClient()),
    RpcClient: vi.fn().mockImplementation(() => createMockWebSocketClient()),

    // Keep all crypto functions as real implementations from actual module
    Keypair: actual.Keypair,
    Address: actual.Address,
    Transaction: actual.Transaction,
    createTransactions: actual.createTransactions,
    kaspaToSompi: actual.kaspaToSompi,
    sompiToKaspa: actual.sompiToKaspa
    // All other cryptographic functions will use actual implementations
  };
});

console.log('✅ Kaspa network mocks loaded (crypto functions are real)');
