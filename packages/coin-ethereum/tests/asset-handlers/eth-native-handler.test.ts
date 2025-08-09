import { expect, test, describe, vi, beforeEach } from 'vitest';
import { EthNativeHandler } from '../../src/chain-wallet/asset-handlers/eth-native-handler';
import { ConnectionManager } from '../../src/chain-wallet/shared/connection-manager';
import { ILogger, NoOpLogger, BalanceQueryParams, TransferParams, createAddress } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import BigNumber from 'bignumber.js';
import { parseEther } from 'ethers';
// Import test setup to ensure address validator is registered
import '../setup';
import { CHAIN_CONFIG } from '../setup';

// Create address helper that uses the registered validator
const createEthAddress = (addr: string) => createAddress(addr, CHAIN_CONFIG.CHAIN);

describe('EthNativeHandler', () => {
  let handler: EthNativeHandler;
  let connectionManager: ConnectionManager;
  let logger: ILogger;
  let mockProvider: any;
  let mockWallet: any;

  beforeEach(() => {
    logger = new NoOpLogger();

    // Mock wallet
    mockWallet = {
      address: '0x742d35cC6634C0532925a3B844BC9e7C68F8C574',
      sendTransaction: vi.fn(),
      getNonce: vi.fn(),
      estimateGas: vi.fn().mockResolvedValue(21000n), // Default gas limit
      signMessage: vi.fn()
    };

    // Mock provider
    mockProvider = {
      getBalance: vi.fn(),
      getFeeData: vi.fn().mockResolvedValue({ gasPrice: 20000000000n }), // Default gas price
      _network: { chainId: 1 }
    };

    // Mock connection manager
    connectionManager = {
      getProvider: vi.fn().mockReturnValue(mockProvider),
      getWallet: vi.fn().mockReturnValue(mockWallet),
      getConnectedWallet: vi.fn().mockReturnValue(mockWallet),
      cleanup: vi.fn(),
      initialize: vi.fn()
    } as any;

    handler = new EthNativeHandler(connectionManager, logger);

    // Spy on the private getGasPrice method to ensure it works
    vi.spyOn(handler as any, 'getGasPrice').mockResolvedValue(20000000000n);
  });

  describe('balanceOf', () => {
    test('should return native ETH balance in wei (smallest unit)', async () => {
      const mockBalance = parseEther('1.5'); // 1.5 ETH in wei
      mockProvider.getBalance.mockResolvedValue(mockBalance);

      const params: BalanceQueryParams = {
        address: createEthAddress('0x742d35cC6634C0532925a3B844BC9e7C68F8C574'),
        token: { assetType: ChainAssetType.Native }
      };

      const result = await handler.balanceOf(params);

      expect(result).toBeInstanceOf(BigNumber);
      // Should return wei, not ETH (1.5 ETH = 1.5 * 10^18 wei)
      expect(result.toString()).toBe(mockBalance.toString());
      expect(mockProvider.getBalance).toHaveBeenCalledWith(params.address);
    });

    test('should handle network errors', async () => {
      mockProvider.getBalance.mockRejectedValue(new Error('network timeout'));

      const params: BalanceQueryParams = {
        address: createEthAddress('0x742d35cC6634C0532925a3B844BC9e7C68F8C574'),
        token: { assetType: ChainAssetType.Native }
      };

      await expect(handler.balanceOf(params)).rejects.toThrow();
    }, 10000); // Increase timeout to 10 seconds

    test('should handle zero balance', async () => {
      mockProvider.getBalance.mockResolvedValue(0n);

      const params: BalanceQueryParams = {
        address: createEthAddress('0x742d35cC6634C0532925a3B844BC9e7C68F8C574'),
        token: { assetType: ChainAssetType.Native }
      };

      const result = await handler.balanceOf(params);
      expect(result.toString()).toBe('0');
    });
  });

  describe('transfer', () => {
    test('should execute native transfer successfully with wei amount', async () => {
      const txHash = '0x1234567890abcdef';
      const txResponse = { hash: txHash };

      mockWallet.getNonce.mockResolvedValue(5);
      mockWallet.sendTransaction.mockResolvedValue(txResponse);

      // Amount is now in wei (smallest unit)
      const amountInWei = parseEther('0.1').toString(); // 0.1 ETH in wei
      const params: TransferParams = {
        recipientAddress: createEthAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
        amount: new BigNumber(amountInWei),
        token: { assetType: ChainAssetType.Native }
      };

      const result = await handler.transfer(params);

      expect(result).toBe(txHash);
      expect(mockWallet.getNonce).toHaveBeenCalled();
      expect(mockWallet.sendTransaction).toHaveBeenCalledWith({
        to: params.recipientAddress,
        value: BigInt(amountInWei), // Value should be in wei
        nonce: 5
      });
    });

    test('should handle insufficient funds error', async () => {
      mockWallet.sendTransaction.mockRejectedValue(new Error('insufficient funds for gas * price + value'));

      // Amount is now in wei (smallest unit)
      const amountInWei = parseEther('100').toString(); // 100 ETH in wei
      const params: TransferParams = {
        recipientAddress: createEthAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
        amount: new BigNumber(amountInWei),
        token: { assetType: ChainAssetType.Native }
      };

      await expect(handler.transfer(params)).rejects.toThrow('insufficient funds for gas * price + value');
    });

    test('should handle network errors during transfer', async () => {
      mockWallet.sendTransaction.mockRejectedValue(new Error('network timeout'));

      // Amount is now in wei (smallest unit)
      const amountInWei = parseEther('0.1').toString(); // 0.1 ETH in wei
      const params: TransferParams = {
        recipientAddress: createEthAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
        amount: new BigNumber(amountInWei),
        token: { assetType: ChainAssetType.Native }
      };

      await expect(handler.transfer(params)).rejects.toThrow('network timeout');
    });
  });

  describe('estimateFee', () => {
    test('should estimate native transfer fee in wei', async () => {
      // Ensure getProvider is mocked properly
      expect(connectionManager.getProvider).toBeDefined();
      expect(connectionManager.getProvider()).toBe(mockProvider);

      // Amount is now in wei (smallest unit)
      const amountInWei = parseEther('0.1').toString(); // 0.1 ETH in wei
      const params: TransferParams = {
        recipientAddress: createEthAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
        amount: new BigNumber(amountInWei),
        token: { assetType: ChainAssetType.Native }
      };

      const result = await handler.estimateFee(params);

      expect(result).toBeInstanceOf(BigNumber);
      // Fee should be in wei, not ETH (21000 * 20000000000 = 420000000000000 wei)
      expect(result.toString()).toBe('420000000000000');
      expect(mockWallet.estimateGas).toHaveBeenCalledWith({
        to: params.recipientAddress,
        value: BigInt(amountInWei)
      });
    }, 10000);

    test('should handle estimation errors', async () => {
      mockWallet.estimateGas.mockRejectedValue(new Error('execution reverted'));

      // Amount is now in wei (smallest unit)
      const amountInWei = parseEther('0.1').toString(); // 0.1 ETH in wei
      const params: TransferParams = {
        recipientAddress: createEthAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
        amount: new BigNumber(amountInWei),
        token: { assetType: ChainAssetType.Native }
      };

      await expect(handler.estimateFee(params)).rejects.toThrow(); // Accept any error type from retry decorator
    }, 10000);
  });

  describe('getAssetType', () => {
    test('should return Native asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.Native);
    });
  });

  describe('cleanup', () => {
    test('should cleanup without errors', () => {
      expect(() => handler.cleanup()).not.toThrow();
    });
  });

  // Private methods getWalletNonce and getGasPrice are tested indirectly through public methods
  // Unit tests should focus on public API behavior, not implementation details
});
