import { expect, test, describe, vi, beforeEach } from 'vitest';
import { Erc20TokenHandler } from '../../src/chain-wallet/asset-handlers/erc20-token-handler';
import { ConnectionManager } from '../../src/chain-wallet/shared/connection-manager';
import { ILogger, NoOpLogger, BalanceQueryParams, TransferParams, createAddress } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import BigNumber from 'bignumber.js';
import { parseUnits } from 'ethers';
// Import test setup to ensure address validator is registered
import '../setup';
import { CHAIN_CONFIG } from '../setup';

// Mock the ethers Contract class
const mockContract = {
  balanceOf: vi.fn(),
  transfer: vi.fn(),
  estimateGas: {
    transfer: vi.fn()
  },
  decimals: vi.fn(),
  symbol: vi.fn(),
  name: vi.fn()
};

vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    Contract: vi.fn().mockImplementation(() => mockContract)
  };
});

// Test addresses
const testAddress = '0x742d35cC6634C0532925a3B844BC9e7C68F8C574';
const recipientAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// Create address helper that uses the registered validator
const createEthAddress = (addr: string) => createAddress(addr, CHAIN_CONFIG.CHAIN);

describe('Erc20TokenHandler', () => {
  let handler: Erc20TokenHandler;
  let connectionManager: ConnectionManager;
  let logger: ILogger;
  let mockProvider: any;
  let mockWallet: any;

  beforeEach(() => {
    logger = new NoOpLogger();

    // Reset all mocks before each test
    vi.clearAllMocks();

    // Set default mock values
    mockContract.decimals.mockResolvedValue(18);
    mockContract.estimateGas.transfer.mockResolvedValue(65000n);

    // Mock wallet
    mockWallet = {
      address: '0x742d35cC6634C0532925a3B844BC9e7C68F8C574',
      getNonce: vi.fn(),
      sendTransaction: vi.fn()
    };

    // Mock provider
    mockProvider = {
      getContract: vi.fn().mockReturnValue(mockContract),
      getFeeData: vi.fn().mockResolvedValue({ gasPrice: 30000000000n }), // Default gas price
      _network: { chainId: 1 }
    };

    // Mock connection manager
    connectionManager = {
      getProvider: vi.fn().mockReturnValue(mockProvider),
      getWallet: vi.fn().mockReturnValue(mockWallet),
      getConnectedWallet: vi.fn().mockReturnValue(mockWallet),
      cleanup: vi.fn()
    } as any;

    handler = new Erc20TokenHandler(connectionManager, logger);

    // Mock Contract.from is not needed since we're mocking getContract
  });

  describe('balanceOf', () => {
    test('should return ERC20 token balance in smallest unit', async () => {
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
      const mockBalance = parseUnits('1000', 6); // 1000 USDC (6 decimals)

      mockContract.balanceOf.mockResolvedValue(mockBalance);
      mockContract.decimals.mockResolvedValue(6);

      const params: BalanceQueryParams = {
        address: createEthAddress(testAddress),
        token: {
          assetType: ChainAssetType.ERC20,
          tokenAddress
        }
      };

      const result = await handler.balanceOf(params);

      expect(result).toBeInstanceOf(BigNumber);
      // Should return smallest unit, not human-readable amount (1000 USDC = 1000 * 10^6 = 1000000000)
      expect(result.toString()).toBe(mockBalance.toString());
      expect(mockContract.balanceOf).toHaveBeenCalledWith(params.address);
    });

    // Note: Token address validation is handled at the wallet layer,
    // not in the handler. These tests have been moved to wallet tests.

    test('should handle zero balance', async () => {
      mockContract.balanceOf.mockResolvedValue(0n);
      mockContract.decimals.mockResolvedValue(18);

      const params: BalanceQueryParams = {
        address: createEthAddress('0x742d35cC6634C0532925a3B844BC9e7C68F8C574'),
        token: {
          assetType: ChainAssetType.ERC20,
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        }
      };

      const result = await handler.balanceOf(params);
      expect(result.toString()).toBe('0');
    });

    test('should handle contract call errors', async () => {
      mockContract.balanceOf.mockRejectedValue(new Error('call revert exception'));

      const params: BalanceQueryParams = {
        address: createEthAddress('0x742d35cC6634C0532925a3B844BC9e7C68F8C574'),
        token: {
          assetType: ChainAssetType.ERC20,
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        }
      };

      await expect(handler.balanceOf(params)).rejects.toThrow(); // Accept any error
    });
  });

  describe('transfer', () => {
    test('should execute ERC20 transfer with smallest unit amount', async () => {
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const txHash = '0xabcdef1234567890';
      const mockTxResponse = { hash: txHash };

      mockContract.decimals.mockResolvedValue(6);
      mockContract.transfer.mockResolvedValue(mockTxResponse);
      mockWallet.getNonce.mockResolvedValue(10);

      // Amount is now in smallest unit (100.5 USDC = 100.5 * 10^6 = 100500000)
      const amountInSmallestUnit = parseUnits('100.5', 6).toString();
      const params: TransferParams = {
        recipientAddress: createEthAddress(recipientAddress),
        amount: new BigNumber(amountInSmallestUnit),
        token: {
          assetType: ChainAssetType.ERC20,
          tokenAddress
        }
      };

      const result = await handler.transfer(params);

      expect(result).toBe(txHash);
      expect(mockContract.transfer).toHaveBeenCalledWith(
        params.recipientAddress,
        BigInt(amountInSmallestUnit), // Amount should be in smallest unit
        expect.any(Object) // Transaction options (nonce, etc.)
      );
    });

    // Note: Token address validation is handled at the wallet layer,
    // not in the handler. These tests have been moved to wallet tests.

    test('should handle transfer failure', async () => {
      mockContract.decimals.mockResolvedValue(6);
      mockContract.transfer.mockRejectedValue(new Error('transfer amount exceeds balance'));

      // Amount is now in smallest unit (100000 USDC = 100000 * 10^6)
      const amountInSmallestUnit = parseUnits('100000', 6).toString();
      const params: TransferParams = {
        recipientAddress: createEthAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
        amount: new BigNumber(amountInSmallestUnit),
        token: {
          assetType: ChainAssetType.ERC20,
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        }
      };

      await expect(handler.transfer(params)).rejects.toThrow('transfer amount exceeds balance');
    });
  });

  describe('estimateFee', () => {
    // Note: Token address validation is handled at the wallet layer,
    // not in the handler. These tests have been moved to wallet tests.

    test('should handle gas estimation failure', async () => {
      mockContract.decimals.mockResolvedValue(6);
      mockContract.estimateGas.transfer.mockRejectedValue(new Error('execution reverted'));

      // Amount is now in smallest unit (100 USDC = 100 * 10^6)
      const amountInSmallestUnit = parseUnits('100', 6).toString();
      const params: TransferParams = {
        recipientAddress: createEthAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
        amount: new BigNumber(amountInSmallestUnit),
        token: {
          assetType: ChainAssetType.ERC20,
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        }
      };

      await expect(handler.estimateFee(params)).rejects.toThrow(); // Accept any error type
    }, 10000);
  });

  // Note: getTokenDecimals is a private method tested indirectly through public methods
  // Unit tests should focus on public API behavior, not implementation details

  describe('getAssetType', () => {
    test('should return ERC20 asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.ERC20);
    });
  });

  describe('cleanup', () => {
    test('should cleanup without errors', () => {
      expect(() => handler.cleanup()).not.toThrow();
    });
  });

  // Private methods getGasPrice and getWalletNonce are tested indirectly through public methods
  // Unit tests should focus on public API behavior, not implementation details
});
