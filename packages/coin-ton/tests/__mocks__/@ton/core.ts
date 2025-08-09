import { vi } from 'vitest';

// Mock Cell structure (reused from ton.ts)
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

// Mock Address structure (matching ton.ts implementation)
const createMockAddress = (address: string = 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t') => ({
  toString: vi.fn().mockImplementation((options?: any) => {
    if (options?.testOnly) {
      return address.replace('UQ', '0Q');
    }
    return address;
  }),
  toRawString: vi.fn().mockReturnValue('0:6f5bc6798680643197e7404339260a4cd92e597ddd8aa604364b2c20bd17820186'),
  toRaw: vi.fn().mockReturnValue({
    workchain: 0,
    hash: Buffer.from('6f5bc6798680643197e7404339260a4cd92e597ddd8aa604364b2c20bd17820186', 'hex')
  }),
  equals: vi.fn().mockReturnValue(false),
  hash: vi.fn().mockReturnValue(Buffer.from('mock-address-hash')),
  workChain: 0,
  isBounceable: true,
  isTestOnly: false
});

export const external = vi.fn().mockImplementation(() => ({
  to: createMockAddress(),
  body: createMockCell()
}));

export const storeStateInit = vi.fn().mockReturnValue(createMockCell());

export const loadStateInit = vi.fn().mockReturnValue({
  code: createMockCell(),
  data: createMockCell()
});

// Mock convert functions
export const fromNano = vi.fn().mockImplementation((amount: bigint | string) => {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  return (Number(value) / 1000000000).toString();
});

export const toNano = vi.fn().mockImplementation((amount: string | number) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(value * 1000000000));
});

// Mock Address class
export const Address = Object.assign(
  vi.fn().mockImplementation((address: string) => createMockAddress(address)),
  {
    parse: vi.fn().mockImplementation((address: string) => {
      console.log('[MOCK @ton/core] Address.parse called with:', address);
      // Check if the address is valid format
      if (!address || typeof address !== 'string') {
        throw new Error('Invalid address format');
      }
      // For test purposes, we'll accept addresses starting with EQ or 0:
      if (!address.startsWith('EQ') && !address.startsWith('0:')) {
        throw new Error('Invalid address');
      }
      return createMockAddress(address);
    }),
    parseFriendly: vi.fn().mockReturnValue({
      address: createMockAddress(),
      isBounceable: false,
      isTestOnly: false
    }),
    parseRaw: vi.fn().mockImplementation((address: string) => createMockAddress(address)),
    isFriendly: vi.fn().mockReturnValue(true)
  }
);

// Mock internal function
export const internal = vi.fn().mockImplementation((params: any) => {
  console.log('[MOCK @ton/core] internal called with:', params);
  // Simply return the params as-is, since they're already in the right format
  return {
    to: params.to,
    value: params.value,
    body: params.body,
    bounce: params.bounce !== undefined ? params.bounce : true
  };
});
