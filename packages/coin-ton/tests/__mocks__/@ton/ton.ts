import { vi } from 'vitest';

// Mock address for consistent testing
const MOCK_TON_ADDRESS = 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t';

// Mock KeyPair structure
const mockKeyPair = {
  publicKey: Buffer.from('5f4f3c4b2a1234567890abcdef1234567890abcdef1234567890abcdef123456', 'hex'),
  secretKey: Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef5f4f3c4b2a1234567890abcdef1234567890abcdef1234567890abcdef123456',
    'hex'
  )
};

// Mock Cell structure
const createMockCell = (): any => {
  const mockCell: any = {
    toBoc: vi.fn().mockReturnValue(Buffer.from('mock-cell-boc')),
    toString: vi.fn().mockReturnValue('mock-cell-string'),
    hash: vi.fn().mockReturnValue(Buffer.from('mock-cell-hash')),
    beginParse: vi.fn().mockReturnValue({
      loadUint: vi.fn(),
      loadAddress: vi.fn(),
      loadCoins: vi.fn(),
      loadBuffer: vi.fn()
    })
  };

  const mockBuilder: any = {
    storeUint: vi.fn().mockReturnThis(),
    storeStringTail: vi.fn().mockReturnThis(),
    storeAddress: vi.fn().mockReturnThis(),
    storeCoins: vi.fn().mockReturnThis(),
    storeBuffer: vi.fn().mockReturnThis(),
    storeRef: vi.fn().mockReturnThis(),
    endCell: vi.fn().mockReturnValue(mockCell)
  };

  mockCell.asBuilder = vi.fn().mockReturnValue(mockBuilder);

  return mockCell;
};

// Mock Address structure
const createMockAddress = (address: string = MOCK_TON_ADDRESS) => ({
  toString: vi.fn().mockImplementation((options?: any) => {
    if (options?.testOnly) {
      return address.replace('UQ', '0Q');
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

// Store for controlling mock behavior
export const mockStore = {
  jettonWallets: new Map<string, any>()
};

// Mock TonClient
const createMockTonClient = () => ({
  open: vi.fn().mockImplementation((contract: any) => {
    console.log('[MOCK] TonClient.open called with:', {
      type: contract._type || contract.constructor?.name || 'unknown',
      hasAddress: !!contract.address,
      addressValue: contract.address?.toString?.() || 'no-address'
    });

    // Check constructor name for JettonMaster and JettonWallet
    const constructorName = contract.constructor?.name;

    // Special handling for JettonWallet
    if (contract._type === 'JettonWallet' || constructorName === 'JettonWallet') {
      const key = contract.address?.toString?.() || 'default';
      const stored = mockStore.jettonWallets.get(key);
      if (stored) {
        console.log(
          '[MOCK] Returning stored JettonWallet for:',
          key,
          'with balance:',
          stored.getBalance.getMockReturnValue()
        );
        return stored;
      }
      console.log('[MOCK] Returning original JettonWallet for:', key);
      return contract;
    }

    // Special handling for JettonMaster
    if (contract._type === 'JettonMaster' || constructorName === 'JettonMaster') {
      console.log('[MOCK] TonClient.open returning JettonMaster with methods');
      // Make sure it has all required methods
      if (!contract.getWalletAddress) {
        console.log('[MOCK] WARNING: JettonMaster missing getWalletAddress method!');
      }
      return contract;
    }

    // Default behavior for other contracts (like wallet)
    const enhancedContract = {
      ...contract,
      address: contract.address || createMockAddress(),
      publicKey: contract.publicKey || mockKeyPair.publicKey,
      getBalance: vi.fn().mockResolvedValue(BigInt('1000000000')),
      sendTransfer: vi.fn().mockResolvedValue(undefined),
      getSeqno: vi.fn().mockResolvedValue(1),
      send: vi.fn().mockResolvedValue(undefined)
    };
    console.log('[MOCK] TonClient.open returning enhanced contract');
    return enhancedContract;
  }),
  getBalance: vi.fn().mockResolvedValue(BigInt('1000000000')),
  getAccountState: vi.fn().mockResolvedValue({
    state: 'active',
    balance: BigInt('1000000000'),
    last_transaction_id: { lt: '123', hash: 'mock-hash' }
  }),
  sendMessage: vi.fn().mockResolvedValue({ hash: 'mock-tx-hash' }),
  estimateExternalMessageFee: vi.fn().mockImplementation(async (address: any, params: any) => {
    console.log('[MOCK] estimateExternalMessageFee called with:', address, params);
    const result = {
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
    };
    console.log('[MOCK] estimateExternalMessageFee returning:', !!result);
    return result;
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

export const Address = Object.assign(
  vi.fn().mockImplementation((address: string) => createMockAddress(address)),
  {
    parse: vi.fn().mockImplementation((address: string) => createMockAddress(address)),
    parseFriendly: vi.fn().mockReturnValue({
      address: createMockAddress(),
      isBounceable: false,
      isTestOnly: false
    }),
    parseRaw: vi.fn().mockImplementation((address: string) => createMockAddress(address)),
    isFriendly: vi.fn().mockReturnValue(true)
  }
);

export const TonClient = vi.fn().mockImplementation((options: any) => {
  console.log('[MOCK] Creating TonClient with options:', options);
  const client = createMockTonClient();
  console.log('[MOCK] TonClient methods:', Object.keys(client));
  console.log('[MOCK] TonClient.open exists:', typeof client.open);
  return client;
});

export const WalletContractV4 = {
  create: vi.fn().mockImplementation((params: any) => {
    console.log('[MOCK] WalletContractV4.create called with:', params);
    // WalletContractV4.create should return a contract, not a wallet
    // The contract has an address property
    const contractAddress = createMockAddress();
    const contract = {
      address: contractAddress,
      publicKey: params.publicKey || mockKeyPair.publicKey,
      // Add other contract methods that might be needed
      init: {
        code: createMockCell(),
        data: createMockCell()
      },
      sendTransfer: vi.fn().mockResolvedValue(undefined),
      getSeqno: vi.fn().mockResolvedValue(1),
      createTransfer: vi.fn().mockReturnValue(createMockCell())
    };
    console.log('[MOCK] WalletContractV4.create returning contract with address:', !!contract.address);
    return contract;
  })
};

// Create factory function for JettonWallet instances
const createJettonWalletInstance = (address: any, balance: bigint = BigInt('1000000000')) => {
  const addressStr = address?.toString?.() || 'unknown';
  console.log('[MOCK] Creating JettonWallet with address:', addressStr, 'balance:', balance.toString());

  const instance = {
    _type: 'JettonWallet',
    address: address,
    getBalance: vi.fn().mockResolvedValue(balance),
    getJettonBalance: vi.fn().mockResolvedValue(balance),
    createTransferMessage: vi.fn().mockReturnValue(createMockCell()),
    sendTransfer: vi.fn().mockResolvedValue(undefined)
  };
  return instance;
};

export const JettonWallet = {
  create: vi.fn().mockImplementation((address) => {
    const addressStr = address?.toString?.() || 'unknown';

    // Check if we have a stored wallet for this address
    const stored = mockStore.jettonWallets.get(addressStr);
    if (stored) {
      console.log('[MOCK] JettonWallet.create returning stored wallet for:', addressStr);
      return stored;
    }

    return createJettonWalletInstance(address);
  })
};

// Keep track of JettonMaster instances for test control
export const jettonMasterInstances = new Map<string, any>();

export const JettonMaster = {
  create: vi.fn().mockImplementation((address) => {
    const addressStr = address?.toString?.() || 'unknown';
    console.log('[MOCK] JettonMaster.create called with address:', addressStr);

    // Check if we have a stored instance for this address
    if (jettonMasterInstances.has(addressStr)) {
      return jettonMasterInstances.get(addressStr);
    }

    const instance = {
      _type: 'JettonMaster', // Add identifier
      address: address,
      provider: {
        get: vi.fn().mockResolvedValue({
          stack: [
            {
              type: 'cell',
              cell: {
                beginParse: () => ({
                  loadAddress: () => createMockAddress('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t')
                })
              }
            }
          ]
        })
      },
      getJettonData: vi.fn().mockResolvedValue({
        totalSupply: BigInt('1000000000000'),
        mintable: true,
        content: {
          // Changed from jettonContent to content
          name: 'Mock Jetton',
          symbol: 'MOCK',
          decimals: 9
        }
      }),
      getWalletAddress: vi.fn().mockImplementation(async (ownerAddress) => {
        const ownerStr = ownerAddress?.toString?.() || 'unknown';
        console.log('[MOCK] JettonMaster.getWalletAddress called with owner:', ownerStr);
        // Always return same wallet address for consistency
        const walletAddr = createMockAddress('EQCxE6mUtQJKFnGfaROTKOtYvgOvSWC1UeBtgx2RpwoeQX9k');
        console.log('[MOCK] Returning jetton wallet address:', walletAddr.toString());
        return walletAddr;
      })
    };

    jettonMasterInstances.set(addressStr, instance);
    return instance;
  })
};

export const toNano = vi.fn().mockImplementation((amount: string | number) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(value * 1000000000));
});

export const fromNano = vi.fn().mockImplementation((amount: bigint | string) => {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  return (Number(value) / 1000000000).toString();
});

export const beginCell = vi.fn().mockImplementation(() => ({
  storeUint: vi.fn().mockReturnThis(),
  storeAddress: vi.fn().mockReturnThis(),
  storeCoins: vi.fn().mockReturnThis(),
  storeBuffer: vi.fn().mockReturnThis(),
  storeRef: vi.fn().mockReturnThis(),
  storeWritable: vi.fn().mockReturnThis(),
  storeDict: vi.fn().mockReturnThis(),
  storeBit: vi.fn().mockReturnThis(),
  storeStringTail: vi.fn().mockReturnThis(),
  storeSlice: vi.fn().mockReturnThis(),
  endCell: vi.fn().mockReturnValue(createMockCell())
}));

export const Cell = Object.assign(
  {
    fromBase64: vi.fn().mockReturnValue(createMockCell()),
    fromBoc: vi.fn().mockReturnValue([createMockCell()])
  },
  {
    EMPTY: Object.assign(createMockCell(), {
      toString: vi.fn().mockReturnValue('te6cckEBAQEAAgAAAEysuc0='),
      toBoc: vi.fn().mockReturnValue(Buffer.from('te6cckEBAQEAAgAAAEysuc0=', 'base64'))
    })
  }
);

export const internal = vi.fn().mockImplementation((params) => {
  console.log('[MOCK @ton/ton] internal called with:', {
    to: params.to?.toString?.() || params.to,
    value: params.value?.toString(),
    hasBody: !!params.body,
    bounce: params.bounce
  });
  // Accept parameters and return them in the expected format
  return {
    to: params.to || createMockAddress(),
    value: params.value || BigInt('1000000000'),
    body: params.body || createMockCell(),
    bounce: params.bounce !== undefined ? params.bounce : true
  };
});

export const external = vi.fn().mockImplementation(() => ({
  to: createMockAddress(),
  body: createMockCell()
}));

export const storeMessage = vi.fn().mockReturnValue(createMockCell());

export const SendMode = {
  PAY_GAS_SEPARATELY: 1,
  IGNORE_ERRORS: 2,
  DESTROY_ACCOUNT_IF_ZERO: 32,
  CARRY_ALL_REMAINING_BALANCE: 128
};

export const StateInit = vi.fn().mockImplementation(() => ({
  code: createMockCell(),
  data: createMockCell()
}));

export const OpenedContract = vi.fn().mockImplementation(() => createMockWallet());
