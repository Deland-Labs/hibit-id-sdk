import { expect, test, beforeEach, vi, afterEach } from 'vitest';
import { IcpChainWallet } from '../src/chain-wallet/wallet';
import { Dfinity } from './test-chains';
import { IcrcMethods, IcrcErrorCode, Icrc49CallCanisterRequest } from '../src/chain-wallet/types';
import { base } from '@delandlabs/crypto-lib';
import { TEST_ADDRESSES } from './test-utils';

const testMnemonic = 'eight record heavy smile elephant venue spend burst initial cousin casual order';

// Mock external dependencies
let mockAgent: any;

vi.mock('@dfinity/utils', () => ({
  createAgent: vi.fn()
}));

vi.mock('@dfinity/ledger-icp', () => ({
  LedgerCanister: {
    create: vi.fn().mockReturnValue({
      transactionFee: vi.fn().mockResolvedValue(BigInt(10000))
    })
  },
  AccountIdentifier: {
    fromPrincipal: vi.fn().mockReturnValue({
      toHex: vi.fn().mockReturnValue('mock-account-id')
    }),
    fromHex: vi.fn().mockReturnValue({})
  }
}));

vi.mock('@dfinity/ledger-icrc', () => ({
  IcrcLedgerCanister: {
    create: vi.fn().mockReturnValue({
      metadata: vi.fn().mockResolvedValue([['icrc1:decimals', { Nat: BigInt(8) }]])
    })
  },
  IcrcMetadataResponseEntries: {
    DECIMALS: 'icrc1:decimals'
  }
}));

vi.mock('ic0', () => ({
  default: vi.fn()
}));

let wallet: IcpChainWallet;

beforeEach(async () => {
  // Initialize mockAgent before each test
  mockAgent = {
    call: vi.fn()
  };

  // Import and mock createAgent
  const { createAgent } = await import('@dfinity/utils');
  vi.mocked(createAgent).mockResolvedValue(mockAgent);

  // Initialize IC mock
  const mockIc = vi.fn().mockReturnValue({
    call: vi.fn().mockResolvedValue([
      {
        name: 'ICRC-3',
        url: 'https://github.com/dfinity/ICRC-3'
      }
    ])
  });
  vi.mocked(await import('ic0')).default = mockIc;

  wallet = new IcpChainWallet(Dfinity, testMnemonic);
  vi.clearAllMocks();
});

afterEach(async () => {
  // Clean up wallet
  if (wallet) {
    try {
      wallet.destroy();
    } catch {
      // Ignore cleanup errors
    }
  }

  // Clear all mocks
  vi.clearAllMocks();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Small delay to allow cleanup
  await new Promise((resolve) => setTimeout(resolve, 100));
});

test('ICRC49 Call Canister - Success', async () => {
  const mockResponse = {
    response: {
      status: 200,
      body: {
        certificate: new ArrayBuffer(64) // Mock certificate
      }
    },
    requestDetails: {
      method: 'test_method',
      arg: 'test_arg'
    }
  };

  mockAgent.call.mockResolvedValue(mockResponse);

  const request = {
    id: 1,
    jsonrpc: '2.0' as const,
    method: IcrcMethods.ICRC49_CALL_CANISTER,
    params: {
      canisterId: TEST_ADDRESSES.VALID_PRINCIPAL_1,
      sender: 'test-sender',
      method: 'test_method',
      arg: base.toBase64(new Uint8Array([1, 2, 3, 4]))
    }
  } as Icrc49CallCanisterRequest;

  const result = await wallet.icrc49CallCanister(request);

  expect(result).toMatchObject({
    id: 1,
    jsonrpc: '2.0',
    result: expect.any(Object)
  });

  expect(mockAgent.call).toHaveBeenCalledWith(
    TEST_ADDRESSES.VALID_PRINCIPAL_1,
    expect.objectContaining({
      methodName: 'test_method',
      arg: expect.any(Uint8Array),
      callSync: true
    })
  );
});

test('ICRC49 Call Canister - Network Error', async () => {
  const mockResponse = {
    response: {
      status: 503, // Service unavailable
      body: {}
    },
    requestDetails: {}
  };

  mockAgent.call.mockResolvedValue(mockResponse);

  const request = {
    id: 2,
    jsonrpc: '2.0' as const,
    method: IcrcMethods.ICRC49_CALL_CANISTER,
    params: {
      canisterId: TEST_ADDRESSES.VALID_PRINCIPAL_1,
      sender: 'test-sender',
      method: 'test_method',
      arg: base.toBase64(new Uint8Array([1, 2, 3, 4]))
    }
  } as Icrc49CallCanisterRequest;

  const result = await wallet.icrc49CallCanister(request);

  expect(result).toMatchObject({
    id: 2,
    jsonrpc: '2.0',
    error: {
      code: IcrcErrorCode.GenericError,
      message: expect.stringContaining('status 503')
    }
  });
});

test('ICRC49 Call Canister - Call Exception', async () => {
  mockAgent.call.mockRejectedValue(new Error('Network connection failed'));

  const request = {
    id: 3,
    jsonrpc: '2.0' as const,
    method: IcrcMethods.ICRC49_CALL_CANISTER,
    params: {
      canisterId: TEST_ADDRESSES.VALID_PRINCIPAL_1,
      sender: 'test-sender',
      method: 'test_method',
      arg: base.toBase64(new Uint8Array([1, 2, 3, 4]))
    }
  } as Icrc49CallCanisterRequest;

  const result = await wallet.icrc49CallCanister(request);

  expect(result).toMatchObject({
    id: 3,
    jsonrpc: '2.0',
    error: {
      code: IcrcErrorCode.GenericError,
      message: 'Network connection failed'
    }
  });
});

test('ICRC49 Call Canister - Invalid Base64 Arg', async () => {
  const request = {
    id: 4,
    jsonrpc: '2.0' as const,
    method: IcrcMethods.ICRC49_CALL_CANISTER,
    params: {
      canisterId: TEST_ADDRESSES.VALID_PRINCIPAL_1,
      sender: 'test-sender',
      method: 'test_method',
      arg: 'invalid-base64!' // Invalid base64
    }
  } as Icrc49CallCanisterRequest;

  const result = await wallet.icrc49CallCanister(request);

  expect(result).toMatchObject({
    id: 4,
    jsonrpc: '2.0',
    error: {
      code: IcrcErrorCode.GenericError,
      message: expect.any(String)
    }
  });
});

test('ICRC49 Call Canister - Empty Response Certificate', async () => {
  const mockResponse = {
    response: {
      status: 200,
      body: {} // No certificate
    },
    requestDetails: {
      method: 'test_method',
      arg: 'test_arg'
    }
  };

  mockAgent.call.mockResolvedValue(mockResponse);

  const request = {
    id: 5,
    jsonrpc: '2.0' as const,
    method: IcrcMethods.ICRC49_CALL_CANISTER,
    params: {
      canisterId: TEST_ADDRESSES.VALID_PRINCIPAL_1,
      sender: 'test-sender',
      method: 'test_method',
      arg: base.toBase64(new Uint8Array([1, 2, 3, 4]))
    }
  } as Icrc49CallCanisterRequest;

  const result = await wallet.icrc49CallCanister(request);

  // Should still succeed but with empty certificate
  expect(result).toMatchObject({
    id: 5,
    jsonrpc: '2.0',
    result: {
      contentMap: expect.any(String),
      certificate: expect.any(String)
    }
  });
});

test('ICRC49 Call Canister - Large Argument', async () => {
  const largeData = new Uint8Array(10000).fill(42); // 10KB of data
  const mockResponse = {
    response: {
      status: 200,
      body: {
        certificate: new ArrayBuffer(64)
      }
    },
    requestDetails: {
      method: 'test_method',
      arg: largeData
    }
  };

  mockAgent.call.mockResolvedValue(mockResponse);

  const request = {
    id: 6,
    jsonrpc: '2.0' as const,
    method: IcrcMethods.ICRC49_CALL_CANISTER,
    params: {
      canisterId: TEST_ADDRESSES.VALID_PRINCIPAL_1,
      sender: 'test-sender',
      method: 'test_method',
      arg: base.toBase64(largeData)
    }
  } as Icrc49CallCanisterRequest;

  const result = await wallet.icrc49CallCanister(request);

  expect(result).toMatchObject({
    id: 6,
    jsonrpc: '2.0',
    result: expect.any(Object)
  });
});
