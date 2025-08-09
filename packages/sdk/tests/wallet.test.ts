import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HibitIdWallet } from '../src/lib/wallet';
import { HibitIdSdkErrorCode } from '../src/lib/enums';
import { ChainAccountInfo } from '../src/lib/types';
import { ChainAccount } from '@delandlabs/coin-base';
import {
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

// Mock window object and session storage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

// Define window globally in the test environment
Object.defineProperty(globalThis, 'window', {
  value: {
    sessionStorage: mockSessionStorage,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    location: { origin: 'http://localhost' },
    document: { createElement: vi.fn() }
  },
  writable: true
});

// Also define sessionStorage globally since the code might access it directly
Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

describe('HibitIdWallet V2', () => {
  let wallet: HibitIdWallet;
  let mockRpc: any;

  const mockOptions = {
    env: 'test' as const,
    chains: ['TON_TESTNET' as any],
    defaultChain: 'TON_TESTNET' as any,
    embedMode: 'float' as const
  };

  const mockChainAccount: ChainAccount = {
    address: '0x1234567890abcdef',
    publicKey: 'mock-public-key',
    chainId: { type: 'TON', network: 'TESTNET' }
  };

  const mockChainAccountInfo: ChainAccountInfo = {
    account: mockChainAccount,
    isPrimary: true,
    isActive: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);

    // Create wallet instance
    wallet = new HibitIdWallet(mockOptions);

    // Get the mocked RPC instance
    mockRpc = {
      call: vi.fn(),
      expose: vi.fn(),
      isReady: Promise.resolve(),
      destroy: vi.fn()
    };

    // Mock the iframe ready promise
    (wallet as any)._iframeReadyPromise.resolve(true);
    (wallet as any)._rpc = mockRpc;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect without chainId parameter (V2 stateless)', async () => {
      mockRpc.call.mockImplementation((method: string) => {
        if (method === 'connect') {
          // Simulate the wallet calling back with connected status
          setTimeout(() => {
            (wallet as any).onRpcConnected({
              address: mockChainAccount.address,
              publicKey: mockChainAccount.publicKey,
              chainId: mockChainAccount.chainId
            });
          }, 0);
        }
      });

      await wallet.connect();

      expect(mockRpc.call).toHaveBeenCalledWith('connect', {
        authType: undefined
      });
      expect(wallet.isConnected).toBe(true);
    });

    it('should connect with auth type', async () => {
      mockRpc.call.mockImplementation((method: string) => {
        if (method === 'connect') {
          setTimeout(() => {
            (wallet as any).onRpcConnected({
              address: mockChainAccount.address,
              publicKey: mockChainAccount.publicKey,
              chainId: mockChainAccount.chainId
            });
          }, 0);
        }
      });

      await wallet.connect('Google');

      expect(mockRpc.call).toHaveBeenCalledWith('connect', {
        authType: 'Google'
      });
    });

    it('should return early if already connected', async () => {
      (wallet as any)._connected = true;

      await wallet.connect();

      expect(mockRpc.call).not.toHaveBeenCalled();
    });

    it('should throw error if connection fails', async () => {
      mockRpc.call.mockImplementation((method: string) => {
        if (method === 'connect') {
          setTimeout(() => {
            // Simulate user canceling by calling onRpcConnected with null
            (wallet as any).onRpcConnected(null);
          }, 0);
        }
      });

      await expect(wallet.connect()).rejects.toThrow('User manually canceled');
    });
  });

  describe('Account Management', () => {
    beforeEach(() => {
      (wallet as any)._connected = true;
    });

    it('should get all accounts with getAccounts()', async () => {
      const mockAccounts = [mockChainAccountInfo];
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { accounts: mockAccounts }
      });

      const result = await wallet.getAccounts();

      expect(mockRpc.call).toHaveBeenCalledWith('getAccounts', {});
      expect(result).toEqual(mockAccounts);
    });

    it('should get specific account with chainId', async () => {
      mockRpc.call.mockResolvedValue({
        success: true,
        data: mockChainAccount
      });

      const result = await wallet.getAccount(
        new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
      );

      expect(mockRpc.call).toHaveBeenCalledWith('getAccount', {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
      });
      expect(result).toEqual(mockChainAccount);
    });

    it('should throw error if not connected when getting accounts', async () => {
      (wallet as any)._connected = false;

      await expect(wallet.getAccounts()).rejects.toThrow(
        'Wallet is not connected'
      );
    });

    it('should throw error if RPC call fails for getAccounts', async () => {
      mockRpc.call.mockResolvedValue({
        success: false,
        errMsg: 'RPC Error'
      });

      await expect(wallet.getAccounts()).rejects.toThrow(
        'Get accounts failed: RPC Error'
      );
    });
  });

  describe('Balance Operations', () => {
    beforeEach(() => {
      (wallet as any)._connected = true;
    });

    it('should get balance with required chainId', async () => {
      const mockBalance = '1000000000';
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { balance: mockBalance }
      });

      const request = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        assetType: ChainAssetType.Native
      };

      const result = await wallet.getBalance(request);

      expect(mockRpc.call).toHaveBeenCalledWith('getBalance', request);
      expect(result).toBe(mockBalance);
    });

    it('should handle token balance request', async () => {
      const mockBalance = '500000000';
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { balance: mockBalance }
      });

      const request = {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        assetType: ChainAssetType.ERC20,
        contractAddress: '0x1234567890abcdef'
      };

      const result = await wallet.getBalance(request);

      expect(mockRpc.call).toHaveBeenCalledWith('getBalance', request);
      expect(result).toBe(mockBalance);
    });
  });

  describe('Message Signing', () => {
    beforeEach(() => {
      (wallet as any)._connected = true;
    });

    it('should sign message with required chainId', async () => {
      const mockSignature = '0xsignature123';
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { signature: mockSignature }
      });

      const request = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        message: 'Hello, World!'
      };

      const result = await wallet.signMessage(request);

      expect(mockRpc.call).toHaveBeenCalledWith('signMessage', {
        message: request.message,
        chainId: request.chainId
      });
      expect(result).toBe(mockSignature);
    });

    it('should throw error if signing fails', async () => {
      mockRpc.call.mockResolvedValue({
        success: false,
        errMsg: 'Signing failed'
      });

      const request = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        message: 'Hello, World!'
      };

      await expect(wallet.signMessage(request)).rejects.toThrow(
        'Sign message failed: Signing failed'
      );
    });
  });

  describe('Transfer Operations', () => {
    beforeEach(() => {
      (wallet as any)._connected = true;
    });

    it('should transfer with required chainId', async () => {
      const mockTxHash = '0xtxhash123';
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { txHash: mockTxHash }
      });

      const request = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        toAddress: '0xrecipient',
        amount: '1000000000',
        assetType: ChainAssetType.Native
      };

      const result = await wallet.transfer(request);

      expect(mockRpc.call).toHaveBeenCalledWith('transfer', request);
      expect(result).toBe(mockTxHash);
    });

    it('should transfer ERC20 token', async () => {
      const mockTxHash = '0xtxhash456';
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { txHash: mockTxHash }
      });

      const request = {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        toAddress: '0xrecipient',
        amount: '1000000',
        assetType: ChainAssetType.ERC20,
        contractAddress: '0xtoken123'
      };

      const result = await wallet.transfer(request);

      expect(mockRpc.call).toHaveBeenCalledWith('transfer', request);
      expect(result).toBe(mockTxHash);
    });
  });

  describe('Fee Estimation', () => {
    beforeEach(() => {
      (wallet as any)._connected = true;
    });

    it('should estimate fee with required chainId', async () => {
      const mockFee = '21000';
      mockRpc.call.mockResolvedValue({
        success: true,
        data: { fee: mockFee }
      });

      const request = {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        toAddress: '0xrecipient',
        amount: '1000000000000000000',
        assetType: ChainAssetType.Native
      };

      const result = await wallet.getEstimatedFee(request);

      expect(mockRpc.call).toHaveBeenCalledWith('getEstimatedFee', request);
      expect(result).toBe(mockFee);
    });
  });

  describe('Deprecated Methods', () => {
    it('should not have addEventListener method in V2', () => {
      expect((wallet as any).addEventListener).toBeUndefined();
    });

    it('should not have removeEventListener method in V2', () => {
      expect((wallet as any).removeEventListener).toBeUndefined();
    });

    it('should not have switchToChain method in V2', () => {
      expect((wallet as any).switchToChain).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw proper error when not connected', async () => {
      (wallet as any)._connected = false;

      await expect(
        wallet.getAccount(new ChainId(ChainType.Ton, ChainNetwork.TonTestNet))
      ).rejects.toThrow('Wallet is not connected');
      await expect(
        wallet.getBalance({
          chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
        })
      ).rejects.toThrow('Wallet is not connected');
      await expect(
        wallet.signMessage({
          chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
          message: 'test'
        })
      ).rejects.toThrow('Wallet is not connected');
      await expect(
        wallet.transfer({
          chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
          toAddress: '0x123',
          amount: '1'
        })
      ).rejects.toThrow('Wallet is not connected');
    });

    it('should handle RPC errors gracefully', async () => {
      (wallet as any)._connected = true;
      mockRpc.call.mockRejectedValue(new Error('Network error'));

      await expect(wallet.getAccounts()).rejects.toThrow(
        'Get accounts failed: Network error'
      );
    });
  });

  describe('Cleanup and Disposal', () => {
    it('should properly dispose resources', async () => {
      (wallet as any)._connected = true;
      (wallet as any)._balancePollIntervalId = setInterval(() => {}, 1000);

      await wallet.dispose();

      expect(wallet.isConnected).toBe(false);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'hibit-id-session'
      );
    });

    it('should disconnect properly', async () => {
      (wallet as any)._connected = true;
      mockRpc.call.mockResolvedValue(undefined);

      await wallet.disconnect();

      expect(mockRpc.call).toHaveBeenCalledWith('disconnect', {});
      expect(wallet.isConnected).toBe(false);
    });
  });
});
