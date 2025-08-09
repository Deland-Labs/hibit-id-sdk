import { vi } from 'vitest';

// Mock address for consistent testing
const MOCK_TON_ADDRESS = 'UQBKgXCNLPexWhs2L79kiARR1phGH4jmVp_ffVRmYySl_BTm';

// Mock KeyPair structure
const mockKeyPair = {
  publicKey: Buffer.from('5f4f3c4b2a1234567890abcdef1234567890abcdef1234567890abcdef123456', 'hex'),
  secretKey: Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef5f4f3c4b2a1234567890abcdef1234567890abcdef1234567890abcdef123456',
    'hex'
  )
};

// Mock Cell structure
const createMockCell = () => ({
  toBoc: vi.fn().mockReturnValue(Buffer.from('mock-cell-boc')),
  toString: vi.fn().mockReturnValue('mock-cell-string'),
  hash: vi.fn().mockReturnValue(Buffer.from('mock-cell-hash')),
  beginParse: vi.fn().mockReturnValue({
    loadUint: vi.fn(),
    loadAddress: vi.fn(),
    loadCoins: vi.fn(),
    loadBuffer: vi.fn()
  })
});

// Mock Address structure
const createMockAddress = (address: string = MOCK_TON_ADDRESS) => ({
  toString: vi.fn().mockImplementation((options?: any) => {
    // Handle different format options
    if (options?.testOnly) {
      return address.replace('UQ', '0Q'); // Mock testnet format
    }
    return address;
  }),
  toRawString: vi.fn().mockReturnValue(address),
  equals: vi.fn().mockReturnValue(true),
  hash: Buffer.from('mock-address-hash'),
  workChain: 0,
  address: Buffer.from('mock-address-buffer')
});

// Mock WalletContract
const createMockWallet = () => ({
  address: createMockAddress(),
  publicKey: mockKeyPair.publicKey,
  sendTransfer: vi.fn().mockResolvedValue(undefined),
  getSeqno: vi.fn().mockResolvedValue(1),
  createTransfer: vi.fn().mockReturnValue(createMockCell()),
  sendInternalTransfer: vi.fn().mockResolvedValue(undefined)
});

// Mock TonClient
const createMockTonClient = () => ({
  open: vi.fn().mockImplementation(() => createMockWallet()),
  getBalance: vi.fn().mockResolvedValue(BigInt('1000000000')), // 1 TON in nanotons
  getAccountState: vi.fn().mockResolvedValue({
    state: 'active',
    balance: BigInt('1000000000'),
    last_transaction_id: { lt: '123', hash: 'mock-hash' }
  }),
  sendMessage: vi.fn().mockResolvedValue({ hash: 'mock-tx-hash' }),
  estimateExternalMessageFee: vi.fn().mockResolvedValue({
    source_fees: {
      in_fwd_fee: BigInt('1000000'),
      storage_fee: BigInt('1000000'),
      gas_fee: BigInt('1000000'),
      fwd_fee: BigInt('1000000')
    },
    destination_fees: {
      in_fwd_fee: BigInt('1000000'),
      storage_fee: BigInt('1000000'),
      gas_fee: BigInt('1000000'),
      fwd_fee: BigInt('1000000')
    }
  }),
  runMethod: vi.fn().mockResolvedValue({
    stack: [{ type: 'int', value: BigInt('1000000000') }]
  }),
  getMasterchainInfo: vi.fn().mockResolvedValue({
    workchain: -1,
    shard: '8000000000000000',
    seqno: 123,
    root_hash: 'mock-root-hash',
    file_hash: 'mock-file-hash'
  })
});

// Mock JettonWallet
const createMockJettonWallet = () => ({
  getJettonBalance: vi.fn().mockResolvedValue(BigInt('5000000000')), // 5 jettons
  createTransferMessage: vi.fn().mockReturnValue(createMockCell()),
  sendTransfer: vi.fn().mockResolvedValue(undefined)
});

// Mock JettonMaster
const createMockJettonMaster = () => ({
  getJettonData: vi.fn().mockResolvedValue({
    totalSupply: BigInt('1000000000000'),
    mintable: true,
    jettonContent: {
      name: 'Mock Jetton',
      symbol: 'MOCK',
      decimals: 9
    }
  }),
  getWalletAddress: vi.fn().mockResolvedValue(createMockAddress())
});

export const mockTonSDK = {
  // @ton/ton module
  ton: {
    Address: Object.assign(
      vi.fn().mockImplementation((address: string) => createMockAddress(address)),
      {
        parse: vi.fn().mockImplementation((address: string) => createMockAddress(address)),
        parseFriendly: vi
          .fn()
          .mockReturnValue({ address: createMockAddress(), isBounceable: false, isTestOnly: false }),
        parseRaw: vi.fn().mockImplementation((address: string) => createMockAddress(address)),
        isFriendly: vi.fn().mockReturnValue(true)
      }
    ),

    TonClient: vi.fn().mockImplementation((options: any) => {
      console.log('[MOCK] Creating TonClient with options:', options);
      const client = createMockTonClient();
      console.log('[MOCK] TonClient methods:', Object.keys(client));
      return client;
    }),

    WalletContractV4: {
      create: vi.fn().mockImplementation(() => createMockWallet())
    },

    JettonWallet: {
      create: vi.fn().mockImplementation(() => createMockJettonWallet())
    },

    JettonMaster: {
      create: vi.fn().mockImplementation(() => createMockJettonMaster())
    },

    // Utility functions
    toNano: vi.fn().mockImplementation((amount: string | number) => {
      const value = typeof amount === 'string' ? parseFloat(amount) : amount;
      return BigInt(Math.floor(value * 1000000000)); // Convert to nanotons
    }),

    fromNano: vi.fn().mockImplementation((amount: bigint | string) => {
      const value = typeof amount === 'string' ? BigInt(amount) : amount;
      return (Number(value) / 1000000000).toString();
    }),

    // Cell operations
    beginCell: vi.fn().mockImplementation(() => ({
      storeUint: vi.fn().mockReturnThis(),
      storeAddress: vi.fn().mockReturnThis(),
      storeCoins: vi.fn().mockReturnThis(),
      storeBuffer: vi.fn().mockReturnThis(),
      storeRef: vi.fn().mockReturnThis(),
      endCell: vi.fn().mockReturnValue(createMockCell())
    })),

    Cell: Object.assign(
      {
        fromBase64: vi.fn().mockReturnValue(createMockCell()),
        fromBoc: vi.fn().mockReturnValue([createMockCell()])
      },
      {
        EMPTY: Object.assign(createMockCell(), {
          asBuilder: vi.fn().mockReturnValue({
            storeUint: vi.fn().mockReturnThis(),
            storeStringTail: vi.fn().mockReturnThis(),
            storeAddress: vi.fn().mockReturnThis(),
            storeCoins: vi.fn().mockReturnThis(),
            storeBuffer: vi.fn().mockReturnThis(),
            storeRef: vi.fn().mockReturnThis(),
            endCell: vi.fn().mockReturnValue(createMockCell())
          })
        })
      }
    ),

    // Message operations
    internal: vi.fn().mockImplementation(() => ({
      to: createMockAddress(),
      value: BigInt('1000000000'),
      body: createMockCell()
    })),

    external: vi.fn().mockImplementation(() => ({
      to: createMockAddress(),
      body: createMockCell()
    })),

    storeMessage: vi.fn().mockReturnValue(createMockCell()),

    // Send modes
    SendMode: {
      PAY_GAS_SEPARATELY: 1,
      IGNORE_ERRORS: 2,
      DESTROY_ACCOUNT_IF_ZERO: 32,
      CARRY_ALL_REMAINING_BALANCE: 128
    },

    // State operations
    StateInit: vi.fn().mockImplementation(() => ({
      code: createMockCell(),
      data: createMockCell()
    })),

    OpenedContract: vi.fn().mockImplementation(() => createMockWallet())
  },

  // @ton/crypto module
  crypto: {
    KeyPair: vi.fn().mockImplementation(() => mockKeyPair),

    mnemonicToPrivateKey: vi.fn().mockImplementation(async (mnemonic: string[]) => {
      // Simulate different key pairs for different mnemonics
      const mnemonicStr = mnemonic.join(' ');
      const hash = mnemonicStr.split('').reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);

      return {
        publicKey: Buffer.from(`${Math.abs(hash).toString(16).padStart(64, '0')}`, 'hex'),
        secretKey: Buffer.from(`${Math.abs(hash).toString(16).padStart(128, '0')}`, 'hex')
      };
    }),

    mnemonicToSeed: vi.fn().mockImplementation(async () => {
      return Buffer.from('mock-seed-from-mnemonic');
    }),

    mnemonicValidate: vi.fn().mockImplementation((mnemonic: string[]) => {
      return mnemonic.length >= 12 && mnemonic.length <= 24;
    })
  },

  // @ton/core module
  core: {
    external: vi.fn().mockImplementation(() => ({
      to: createMockAddress(),
      body: createMockCell()
    })),

    storeStateInit: vi.fn().mockReturnValue(createMockCell()),

    loadStateInit: vi.fn().mockReturnValue({
      code: createMockCell(),
      data: createMockCell()
    })
  }
};

// Export individual mocks for direct use
export const mockTonClient = createMockTonClient();
export const mockAddress = createMockAddress();
export const mockCell = createMockCell();
export const mockWallet = createMockWallet();
export { mockKeyPair, MOCK_TON_ADDRESS };
