import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HibitIdWallet } from '../src/lib/wallet';
import { ChainAccountInfo } from '../src/lib/types';
import {
  ChainAccount,
  ChainAssetType,
  ChainType,
  ChainNetwork,
  ChainId
} from '@delandlabs/hibit-basic-types';

// Mock the RPC module
vi.mock('@mixer/postmessage-rpc', () => ({
  RPC: vi.fn().mockImplementation(() => ({
    expose: vi.fn(),
    call: vi.fn(),
    isReady: Promise.resolve(),
    destroy: vi.fn()
  }))
}));

// Mock the DOM module
vi.mock('../src/lib/dom', () => ({
  HibitIdController: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    setOpen: vi.fn(),
    getBoundingRect: vi.fn(() => ({
      width: 100,
      height: 100,
      right: 100,
      top: 100
    }))
  })),
  HibitIdIframe: vi.fn().mockImplementation(() => ({
    iframe: { contentWindow: {} },
    visible: false,
    isDesktop: true,
    show: vi.fn(),
    hide: vi.fn(),
    destroy: vi.fn(),
    updateStyle: vi.fn()
  }))
}));

// Mock logger
vi.mock('../src/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    sanitizeErrorMessage: vi.fn((msg) => msg)
  }
}));

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

// Only define sessionStorage if window exists (jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage
  });
} else {
  // Provide global fallback for Node.js environment
  global.sessionStorage = mockSessionStorage;
}

describe('SDK V2 Integration Tests', () => {
  let wallet: HibitIdWallet;
  let mockRpc: any;

  const mockOptions = {
    env: 'test' as const,
    chains: ['TON_TESTNET' as any, 'ETHEREUM_SEPOLIA' as any],
    defaultChain: 'TON_TESTNET' as any,
    embedMode: 'float' as const
  };

  const mockTonAccount: ChainAccount = {
    address: 'UQBKgXCNLPexWhs2L79kiARR1phGH4jmVp_ffVRmYySl_BTm',
    publicKey: 'ton-public-key',
    chainId: { type: 'TON', network: 'TESTNET' }
  };

  const mockEthAccount: ChainAccount = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    publicKey: 'eth-public-key',
    chainId: { type: 'ETHEREUM', network: 'SEPOLIA' }
  };

  const mockAccounts: ChainAccountInfo[] = [
    {
      account: mockTonAccount,
      isPrimary: true,
      isActive: true
    },
    {
      account: mockEthAccount,
      isPrimary: false,
      isActive: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);

    wallet = new HibitIdWallet(mockOptions);

    mockRpc = {
      call: vi.fn(),
      expose: vi.fn(),
      isReady: Promise.resolve(),
      destroy: vi.fn()
    };

    (wallet as any)._iframeReadyPromise.resolve(true);
    (wallet as any)._rpc = mockRpc;
    (wallet as any)._connected = true;
  });

  describe('Multi-chain Workflow', () => {
    it('should demonstrate the new V2 stateless workflow', async () => {
      // Step 1: Connect (no chainId required)
      (wallet as any)._connected = false;

      mockRpc.call.mockImplementation((method: string) => {
        if (method === 'connect') {
          setTimeout(() => {
            (wallet as any).onRpcConnected({
              address: mockTonAccount.address,
              publicKey: mockTonAccount.publicKey,
              chainId: mockTonAccount.chainId
            });
          }, 0);
        }
      });

      await wallet.connect();
      expect(mockRpc.call).toHaveBeenCalledWith('connect', {
        authType: undefined
      });

      // Step 2: Get all accounts overview
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { accounts: mockAccounts }
      });

      const allAccounts = await wallet.getAccounts();
      expect(allAccounts).toEqual(mockAccounts);

      const primaryAccount = allAccounts.find((acc) => acc.isPrimary);
      const activeTonAccount = allAccounts.find(
        (acc) =>
          acc.account.chainId.type === 'TON' &&
          acc.account.chainId.network === 'TESTNET' &&
          acc.isActive
      );

      expect(primaryAccount?.account).toEqual(mockTonAccount);
      expect(activeTonAccount?.account).toEqual(mockTonAccount);

      // Step 3: Get specific account for known chain
      mockRpc.call.mockResolvedValue({
        success: true,
        data: mockEthAccount
      });

      const ethAccount = await wallet.getAccount(
        new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia)
      );
      expect(ethAccount).toEqual(mockEthAccount);
      expect(mockRpc.call).toHaveBeenCalledWith('getAccount', {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia)
      });
    });

    it('should perform parallel operations on different chains', async () => {
      // Setup mock responses for parallel operations
      mockRpc.call.mockImplementation((method: string, params: any) => {
        if (method === 'getBalance') {
          if (
            params.chainId?.toString() ===
            new ChainId(ChainType.Ton, ChainNetwork.TonTestNet).toString()
          ) {
            return Promise.resolve({
              success: true,
              data: { balance: '1000000000' }
            }); // 1 TON
          } else if (
            params.chainId?.toString() ===
            new ChainId(
              ChainType.Ethereum,
              ChainNetwork.EthereumSepolia
            ).toString()
          ) {
            return Promise.resolve({
              success: true,
              data: { balance: '1000000000000000000' }
            }); // 1 ETH
          }
        }
        return Promise.resolve({ success: true, data: {} });
      });

      // Perform parallel balance queries
      const [tonBalance, ethBalance] = await Promise.all([
        wallet.getBalance({
          chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
          assetType: ChainAssetType.Native
        }),
        wallet.getBalance({
          chainId: new ChainId(
            ChainType.Ethereum,
            ChainNetwork.EthereumSepolia
          ),
          assetType: ChainAssetType.Native
        })
      ]);

      expect(tonBalance).toBe('1000000000');
      expect(ethBalance).toBe('1000000000000000000');
      expect(mockRpc.call).toHaveBeenCalledTimes(2);
    });

    it('should handle token operations across chains', async () => {
      // Mock ERC20 token balance
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { balance: '1000000' } // 1 USDC (6 decimals)
      });

      const usdcBalance = await wallet.getBalance({
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        assetType: ChainAssetType.ERC20,
        contractAddress: '0xA0b86a33E6441Fc8C10Bb2e6ba14d08C6bb3d2E3' // USDC on Sepolia
      });

      expect(usdcBalance).toBe('1000000');
      expect(mockRpc.call).toHaveBeenCalledWith('getBalance', {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        assetType: ChainAssetType.ERC20,
        contractAddress: '0xA0b86a33E6441Fc8C10Bb2e6ba14d08C6bb3d2E3'
      });
    });

    it('should perform cross-chain message signing', async () => {
      // Mock signing responses
      mockRpc.call.mockImplementation((method: string, params: any) => {
        if (method === 'signMessage') {
          if (
            params.chainId?.toString() ===
            new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
              .toString()
              .toString()
          ) {
            return Promise.resolve({
              success: true,
              data: { signature: 'ton-signature-123' }
            });
          } else if (
            params.chainId?.toString() ===
            new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia)
              .toString()
              .toString()
          ) {
            return Promise.resolve({
              success: true,
              data: { signature: '0xeth-signature-456' }
            });
          }
        }
        return Promise.resolve({ success: true, data: {} });
      });

      const message = 'Hello, multi-chain world!';

      // Sign the same message on different chains
      const [tonSignature, ethSignature] = await Promise.all([
        wallet.signMessage({
          chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
          message
        }),
        wallet.signMessage({
          chainId: new ChainId(
            ChainType.Ethereum,
            ChainNetwork.EthereumSepolia
          ),
          message
        })
      ]);

      expect(tonSignature).toBe('ton-signature-123');
      expect(ethSignature).toBe('0xeth-signature-456');
    });

    it('should handle fee estimation for different chains', async () => {
      // Mock fee estimation responses
      mockRpc.call.mockImplementation((method: string, params: any) => {
        if (method === 'getEstimatedFee') {
          if (
            params.chainId?.toString() ===
            new ChainId(ChainType.Ton, ChainNetwork.TonTestNet).toString()
          ) {
            return Promise.resolve({ success: true, data: { fee: '1000000' } }); // TON fees in nanotons
          } else if (
            params.chainId?.toString() ===
            new ChainId(
              ChainType.Ethereum,
              ChainNetwork.EthereumSepolia
            ).toString()
          ) {
            return Promise.resolve({
              success: true,
              data: { fee: '21000000000000' }
            }); // ETH fees in wei
          }
        }
        return Promise.resolve({ success: true, data: {} });
      });

      const tonTransferRequest = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        toAddress: 'UQBKgXCNLPexWhs2L79kiARR1phGH4jmVp_ffVRmYySl_BTm',
        amount: '1000000000',
        assetType: ChainAssetType.Native
      };

      const ethTransferRequest = {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        toAddress: '0x1234567890abcdef1234567890abcdef12345678',
        amount: '1000000000000000000',
        assetType: ChainAssetType.Native
      };

      const [tonFee, ethFee] = await Promise.all([
        wallet.getEstimatedFee(tonTransferRequest),
        wallet.getEstimatedFee(ethTransferRequest)
      ]);

      expect(tonFee).toBe('1000000');
      expect(ethFee).toBe('21000000000000');
    });
  });

  describe('Error Handling in Multi-chain Context', () => {
    it('should handle chain-specific errors appropriately', async () => {
      // Mock chain-specific error
      mockRpc.call.mockImplementation((method: string, params: any) => {
        if (
          method === 'getBalance' &&
          params.chainId?.toString() ===
            new ChainId(ChainType.Ton, ChainNetwork.TonTestNet).toString()
        ) {
          return Promise.resolve({
            success: false,
            errMsg: 'TON network unavailable'
          });
        } else if (
          method === 'getBalance' &&
          params.chainId?.toString() ===
            new ChainId(
              ChainType.Ethereum,
              ChainNetwork.EthereumSepolia
            ).toString()
        ) {
          return Promise.resolve({
            success: true,
            data: { balance: '1000000000000000000' }
          });
        }
        return Promise.resolve({ success: true, data: {} });
      });

      // TON should fail
      await expect(
        wallet.getBalance({
          chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
          assetType: ChainAssetType.Native
        })
      ).rejects.toThrow('Get balance failed: TON network unavailable');

      // ETH should succeed
      const ethBalance = await wallet.getBalance({
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        assetType: ChainAssetType.Native
      });

      expect(ethBalance).toBe('1000000000000000000');
    });

    it('should handle inactive chains gracefully', async () => {
      const inactiveAccounts: ChainAccountInfo[] = [
        {
          account: mockTonAccount,
          isPrimary: true,
          isActive: true
        },
        {
          account: mockEthAccount,
          isPrimary: false,
          isActive: false // Ethereum is inactive
        }
      ];

      mockRpc.call.mockResolvedValue({
        success: true,
        data: { accounts: inactiveAccounts }
      });

      const accounts = await wallet.getAccounts();
      const activeAccounts = accounts.filter((acc) => acc.isActive);
      const inactiveAccounts2 = accounts.filter((acc) => !acc.isActive);

      expect(activeAccounts).toHaveLength(1);
      expect(inactiveAccounts2).toHaveLength(1);
      expect(activeAccounts[0].account.chainId.type).toBe('TON');
      expect(inactiveAccounts2[0].account.chainId.type).toBe('ETHEREUM');
    });
  });

  describe('Backward Compatibility Notes', () => {
    it('should not have deprecated chainChanged events', () => {
      // In V1, this would have been possible:
      // wallet.addEventListener('chainChanged', handler);

      // In V2, these methods should not exist
      expect((wallet as any).addEventListener).toBeUndefined();
      expect((wallet as any).removeEventListener).toBeUndefined();
    });

    it('should not have deprecated switchToChain method', () => {
      // In V1, this would have been possible:
      // await wallet.switchToChain(new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia));

      // In V2, this method should not exist
      expect((wallet as any).switchToChain).toBeUndefined();
    });

    it('should require chainId for all operations', async () => {
      // In V1, these would have worked without chainId:
      // await wallet.getAccount();
      // await wallet.getBalance();
      // await wallet.signMessage('message');

      // In V2, all these operations require explicit chainId
      // These are async methods, so we need to check if they reject
      await expect((wallet as any).getAccount()).rejects.toThrow();
      await expect((wallet as any).getBalance()).rejects.toThrow();
      await expect((wallet as any).signMessage('test')).rejects.toThrow();
    });
  });
});
