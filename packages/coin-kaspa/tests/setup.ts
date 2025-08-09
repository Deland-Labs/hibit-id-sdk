import 'reflect-metadata';
import { vi } from 'vitest';
import { ChainValidation, ChainValidator } from '@delandlabs/coin-base';
import { ChainType } from '@delandlabs/hibit-basic-types';

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

// Create mock RPC client for network operations
const createMockRpcClient = () => {
  const eventHandlers = new Map();
  let virtualChainSubscribed = false;

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

    // Balance query
    getBalanceByAddress: vi.fn().mockImplementation((_address: string) => {
      return Promise.resolve({
        balance: '1000000000' // 10 KAS in sompi
      });
    }),

    // UTXO query
    getUtxosByAddresses: vi.fn().mockImplementation((addresses: string[]) => {
      return Promise.resolve({
        entries: [
          {
            address: addresses[0],
            outpoint: {
              transactionId: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
              index: 0
            },
            utxoEntry: {
              amount: '500000000', // 5 KAS in sompi
              scriptPublicKey: '76a914a1b2c3d4e5f6789012345678901234567890123488ac',
              blockDaaScore: '1000000',
              isCoinbase: false
            }
          }
        ]
      });
    }),

    // Fee estimation
    getFeeEstimate: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        estimate: {
          priorityBucket: {
            feerate: 1.0,
            estimatedSeconds: 10
          }
        }
      });
    }),

    // Transaction submission
    submitTransaction: vi.fn().mockImplementation((_params: any) => {
      return Promise.resolve({
        transactionId: 'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc'
      });
    }),

    // Network RPC calls (generic)
    sendRpcRequest: vi.fn().mockImplementation((method: string, _params: any) => {
      switch (method) {
        case 'getBlockDagInfo':
          return Promise.resolve({
            networkName: 'kaspa-mainnet',
            blockCount: 1000000,
            virtualDaaScore: 1000000
          });
        default:
          return Promise.resolve({});
      }
    }),

    // Event listener methods for DOM-like interface
    addEventListener: vi.fn().mockImplementation(() => {}),
    removeEventListener: vi.fn().mockImplementation(() => {}),
    ping: vi.fn().mockImplementation(() => {
      console.debug('[MOCK] RpcClient.ping called');
    }),

    // Transaction confirmation methods
    getMempoolEntry: vi.fn().mockImplementation((_params: any) => {
      // Simulate transaction not found in mempool (already confirmed)
      return Promise.resolve({ entry: null });
    }),

    subscribeVirtualChainChanged: vi.fn().mockImplementation((includeAcceptedTransactionIds: boolean) => {
      console.log(`[KASPA subscribed virtual chain] includeAcceptedTransactionIds: ${includeAcceptedTransactionIds}`);
      virtualChainSubscribed = true;
      return Promise.resolve();
    }),

    // Helper method to simulate virtual chain events (for testing)
    simulateVirtualChainEvent: (eventData: any) => {
      const handler = eventHandlers.get('VirtualChainChanged');
      if (handler && virtualChainSubscribed) {
        // Simulate async event with setTimeout
        setTimeout(() => handler(eventData), 0);
      }
    },

    getBlockDagInfo: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        networkName: 'kaspa-mainnet',
        blockCount: 1000000,
        virtualDaaScore: 1000000,
        tipHashes: [
          'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
          'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890def'
        ]
      });
    }),

    getBlock: vi.fn().mockImplementation((params: any) => {
      const { hash, includeTransactions } = params;

      return Promise.resolve({
        block: {
          verboseData: {
            hash: hash,
            timestamp: Date.now()
          },
          transactions: includeTransactions
            ? [
                {
                  verboseData: {
                    transactionId: 'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
                    hash: 'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
                    blockHash: hash,
                    blockTime: Date.now()
                  }
                }
              ]
            : []
        }
      });
    })
  };
};

// Create mock KRC20 RPC client
const createMockKrc20RpcClient = () => {
  return {
    // Get KRC20 token info
    getKrc20TokenInfo: vi.fn().mockImplementation((tick: string) => {
      return Promise.resolve({
        message: 'successful',
        result: [
          {
            tick: tick.toUpperCase(),
            max: '21000000',
            lim: '1000',
            pre: '0',
            to: 'kaspa:qr0k...',
            dec: '8',
            minted: '1000000',
            opScoreAdd: '1234567890',
            opScoreMod: '1234567890',
            state: 'finished',
            hashRev: 'abc123...',
            mtsAdd: '1234567890'
          }
        ]
      });
    }),

    // Get KRC20 balance
    getKrc20Balance: vi.fn().mockImplementation((_address: string, tick: string) => {
      return Promise.resolve({
        message: 'successful',
        result: [
          {
            tick: tick.toUpperCase(),
            balance: '10000000000', // 100 tokens with 8 decimals
            locked: '0',
            dec: '8'
          }
        ]
      });
    })
  };
};

// Mock the @kcoin/kaspa-web3.js module
vi.mock('@kcoin/kaspa-web3.js', async () => {
  const actual = await vi.importActual('@kcoin/kaspa-web3.js');

  // Mock transaction-related classes
  const createMockTransaction = () => ({
    tx: {
      inputs: [],
      outputs: [],
      mass: 1000n
    },
    sign: vi.fn().mockReturnThis(),
    toSubmittableJsonTx: vi.fn().mockReturnValue({
      transaction: {
        inputs: [],
        outputs: []
      }
    })
  });

  const createMockGenerator = () => {
    let callCount = 0;
    return {
      generateTransaction: vi.fn().mockImplementation(() => {
        if (callCount++ === 0) {
          return createMockTransaction();
        }
        return undefined; // End after first transaction
      }),
      summary: vi.fn().mockReturnValue({
        finalTransactionId: 'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
        fees: 1000n,
        aggregatedUtxos: 1,
        aggregatedAmount: 500000000n,
        finalTransactions: 1,
        finalAmount: 100000000n,
        changeAmount: 399999000n
      })
    };
  };

  return {
    // Use real crypto functions from actual module
    ...actual,
    // Only mock network client operations
    RpcClient: vi.fn().mockImplementation(() => createMockRpcClient()),
    Krc20RpcClient: vi.fn().mockImplementation(() => createMockKrc20RpcClient()),

    // Mock transaction-related classes
    Generator: vi.fn().mockImplementation(() => createMockGenerator()),
    GeneratorSettings: vi.fn().mockImplementation((settings: any) => settings),
    SignableTransaction: vi.fn().mockImplementation(() => createMockTransaction()),

    // Mock Fees class
    Fees: vi.fn().mockImplementation((amount: bigint) => ({
      amount,
      toString: () => amount.toString(),
      valueOf: () => Number(amount)
    })),

    // Mock transfer params
    SendKasParams: vi
      .fn()
      .mockImplementation((sender: any, amount: any, recipient: any, networkId: any, fees: any, payload?: any) => ({
        sender,
        amount,
        recipient,
        networkId,
        priorityFee: fees,
        payload,
        toGeneratorSettings: vi.fn().mockImplementation((utxos: any[]) => ({
          utxos,
          outputs: [{ address: recipient, amount }],
          changeAddress: sender,
          priorityFee: fees,
          setPriorityFee: vi.fn().mockReturnThis()
        }))
      })),

    Krc20TransferParams: vi
      .fn()
      .mockImplementation(
        (sender: any, networkId: any, commitFee: any, options: any, revealFee: any, amountForInscribe: any) => ({
          sender,
          networkId,
          commitTxPriorityFee: commitFee,
          revealPriorityFee: revealFee,
          options,
          amountForInscribe,
          toCommitTxGeneratorSettings: vi.fn().mockImplementation((utxos: any[]) => ({
            utxos,
            outputs: [],
            changeAddress: sender,
            setPriorityFee: vi.fn().mockReturnThis()
          })),
          toRevealTxGeneratorSettings: vi.fn().mockImplementation((utxos: any[], commitTxId: any) => ({
            utxos,
            outputs: [],
            changeAddress: sender,
            commitTxId,
            setPriorityFee: vi.fn().mockReturnThis()
          }))
        })
      ),

    // Mock Hash utility
    Hash: {
      fromHex: vi.fn().mockImplementation((hex: string) => ({ hex }))
    }
  };
});

// Register Kaspa address validator for tests
class MockKaspaValidator implements ChainValidator {
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;

    // Simple validation for test addresses
    // Accept addresses starting with 'kaspa:' or valid test addresses
    if (address.startsWith('kaspa:')) return true;
    if (address === 'kaspa:qr3gfcucsmj2qzsvn8afnehkvz3zxgssxzr6vc5yq2ml2mq3zw2cg3eusnyqw') return true;

    return false;
  }
  validateTokenAddress(tokenAddress: string): boolean {
    if (!tokenAddress || typeof tokenAddress !== 'string') return false;

    // Simple validation for KRC20 ticks
    return tokenAddress.length > 0 && tokenAddress.length <= 20;
  }
}

ChainValidation.register(ChainType.Kaspa, new MockKaspaValidator());
// Mock validator is now registered above

// Console log to confirm mocks are loaded
console.log('✅ Kaspa Web3 mocks loaded successfully');
