import { vi } from 'vitest';
import BigNumber from 'bignumber.js';

// Mock UTXO data structure
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

// Mock balance cache data
const mockBalanceCache: Record<string, { native: BigNumber; utxos: any[] }> = {
  'kaspa:qqd6e65yefepe9wk0m9vuxdufxd80sphy67gwwd0vdaumzdt4tc9s3qt0lqeh': {
    native: new BigNumber('1.0'), // 1 KAS
    utxos: mockUtxos
  },
  'kaspa:qpumuen7l8wthtz45p3ftn58pvrs9xlumvkuu2xet8egzkcklqtes4ypce9sf': {
    native: new BigNumber('2.5'), // 2.5 KAS
    utxos: [
      ...mockUtxos,
      {
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        index: 1,
        amount: 150000000n, // 1.5 KAS in sompi
        scriptPublicKey: '76a914' + '1'.repeat(40) + '88ac',
        isCoinbase: false,
        blockDaaScore: 1000001
      }
    ]
  }
};

// Mock fee data
const mockFeeEstimate = {
  fee: 1000n, // 0.00001 KAS in sompi
  feeRate: 1000, // sompi per byte
  priorityFee: 500n
};

// Mock transaction result
const mockTransactionResult = {
  txId: 'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
  hash: 'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
  blockHeight: 1000002,
  acceptingBlockHash: 'abc1234567890def1234567890def1234567890def1234567890def1234567890'
};

// Create mock websocket client
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
    emit: vi.fn((event: string, ...args: any[]) => {
      const handler = eventHandlers.get(event);
      if (handler) handler(...args);
    }),

    // UTXO subscription
    subscribeUtxosChanged: vi.fn().mockImplementation((addresses: string[]) => {
      console.log(`[KASPA subscribed utxo] ${addresses.join(', ')}`);
      // Simulate subscription success
      setTimeout(() => {
        eventHandlers.get('utxos-changed')?.({
          added: mockUtxos,
          removed: []
        });
      }, 100);
      return Promise.resolve();
    }),

    unsubscribeUtxosChanged: vi.fn().mockResolvedValue(undefined),

    // Balance queries
    getBalance: vi.fn().mockImplementation((address: string) => {
      const cached = mockBalanceCache[address];
      return Promise.resolve(cached?.native || new BigNumber('0'));
    }),

    getUtxos: vi.fn().mockImplementation((address: string) => {
      const cached = mockBalanceCache[address];
      return Promise.resolve(cached?.utxos || []);
    }),

    // Transaction operations
    sendRpcRequest: vi.fn().mockImplementation((method: string, params: any) => {
      switch (method) {
        case 'getUtxosByAddresses':
          const addresses = params.addresses || [];
          const allUtxos = addresses.flatMap((addr: string) => mockBalanceCache[addr]?.utxos || []);
          return Promise.resolve({ entries: allUtxos });

        case 'submitTransaction':
          return Promise.resolve(mockTransactionResult);

        case 'getBlockDagInfo':
          return Promise.resolve({
            networkName: 'kaspa-mainnet',
            blockCount: 1000000,
            headerCount: 1000000,
            tipHashes: ['abc123'],
            difficulty: 1000000000,
            pastMedianTime: Date.now() - 60000,
            virtualParentHashes: ['def456'],
            pruningPointHash: 'ghi789',
            virtualDaaScore: 1000000,
            sink: 'jkl012'
          });

        default:
          console.warn(`Unhandled RPC method: ${method}`);
          return Promise.resolve({});
      }
    })
  };
};

// Mock factory that imports actual functions
export const mockKaspaWeb3 = async () => {
  const actual = await import('@kcoin/kaspa-web3.js');

  return {
    // Use real crypto functions from actual module
    ...actual,

    // Main client class (network operations - mock these)
    KaspaWebSocketClient: vi.fn().mockImplementation(() => createMockWebSocketClient()),

    // Utility functions
    createTransactions: vi.fn().mockImplementation((params: any) => {
      const { outputs, utxos, changeAddress } = params;
      const feeAmount = BigInt(mockFeeEstimate.fee);

      // Validate inputs
      if (!outputs || outputs.length === 0) {
        throw new Error('No outputs specified');
      }

      if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available');
      }

      // Calculate total output amount (ensure all are bigint)
      const totalOutput: bigint = outputs.reduce((sum: bigint, output: any) => sum + BigInt(output.amount), 0n);

      // Calculate total input amount (ensure all are bigint)
      const totalInput: bigint = utxos.reduce((sum: bigint, utxo: any) => sum + BigInt(utxo.amount), 0n);

      // Check if we have enough balance
      if (totalInput < totalOutput + feeAmount) {
        throw new Error('Insufficient balance');
      }

      // Return mock transaction
      return {
        transactions: [
          {
            version: 1,
            inputs: utxos.map((utxo: any) => ({
              previousOutpoint: {
                txId: utxo.txId,
                index: utxo.index
              },
              signatureScript: '',
              sequence: 0
            })),
            outputs: [
              ...outputs,
              // Change output
              {
                amount: totalInput - totalOutput - feeAmount,
                scriptPublicKey: '76a914' + changeAddress + '88ac'
              }
            ],
            lockTime: 0,
            subnetworkId: '0000000000000000000000000000000000000000',
            gas: 0,
            payloadHash: '0000000000000000000000000000000000000000000000000000000000000000',
            payload: '',
            sign: vi.fn().mockReturnValue({
              transaction: {
                tx: {
                  inputs: [],
                  outputs: []
                },
                createInputSignature: vi.fn(),
                fillInputSignature: vi.fn()
              }
            }),
            toSubmittableJsonTx: vi.fn().mockReturnValue({
              transaction: mockTransactionResult
            })
          }
        ],
        summary: {
          aggregatedUtxos: utxos.length,
          aggregatedAmount: totalInput,
          finalTransactions: 1,
          finalAmount: totalOutput,
          fees: feeAmount,
          changeAmount: totalInput - totalOutput - feeAmount
        }
      };
    }),

    // Address, Transaction, Keypair utilities use real implementations from actual module
    // (No mocking of cryptographic functions)

    // Utility functions use real implementations (no mocking of conversion functions)

    // Fees class
    Fees: vi.fn().mockImplementation((amount: bigint) => ({
      amount,
      toString: () => amount.toString(),
      valueOf: () => Number(amount)
    })),

    // NetworkId enum
    NetworkId: {
      Mainnet: {
        networkType: 'mainnet',
        toString: () => 'mainnet'
      },
      Testnet10: {
        networkType: 'testnet-10',
        toString: () => 'testnet-10'
      },
      Testnet: {
        networkType: 'testnet',
        toString: () => 'testnet'
      }
    },

    // RpcClient mock
    RpcClient: vi.fn().mockImplementation(() => ({
      ...createMockWebSocketClient(),
      addEventListener: vi.fn().mockImplementation(() => {}),
      removeEventListener: vi.fn().mockImplementation(() => {}),
      ping: vi.fn().mockImplementation(() => {
        console.debug('[MOCK] RpcClient.ping called');
      })
    })),

    // Krc20RpcClient mock
    Krc20RpcClient: vi.fn().mockImplementation(() => ({
      getBalance: vi.fn().mockResolvedValue(new BigNumber('0')),
      transfer: vi.fn().mockResolvedValue(mockTransactionResult),
      estimateFee: vi.fn().mockResolvedValue(mockFeeEstimate.fee)
    })),

    // Hash utilities
    Hash: {
      fromHex: vi.fn().mockImplementation((hex: string) => ({ hex }))
    },

    // Generator settings and utilities
    GeneratorSettings: vi.fn().mockImplementation(() => ({})),
    GeneratorSummary: vi.fn().mockImplementation(() => ({})),
    Generator: vi.fn().mockImplementation(() => ({})),
    SignableTransaction: vi.fn().mockImplementation(() => ({})),

    // Transfer option types with mocked constructors
    Krc20TransferOptions: vi.fn().mockImplementation((options: any) => options),
    Krc20TransferParams: vi
      .fn()
      .mockImplementation(
        (sender: any, networkId: any, commitFee: any, options: any, revealFee: any, amountForInscribe: any) => ({
          sender,
          networkId,
          commitFee,
          options,
          revealFee,
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

    // Resolver
    Resolver: Object.assign(
      vi.fn().mockImplementation(() => ({
        getEndpoint: vi.fn().mockReturnValue('wss://mock-endpoint')
      })),
      {
        createWithEndpoints: vi.fn().mockImplementation((endpoints: string[]) => ({
          getEndpoint: vi.fn().mockReturnValue(endpoints[0] || 'wss://mock-endpoint')
        }))
      }
    )
  };
};

// Export individual mocks for direct use
export const mockWebSocketClient = createMockWebSocketClient();
export { mockUtxos, mockBalanceCache, mockFeeEstimate, mockTransactionResult };
