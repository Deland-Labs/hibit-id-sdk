import 'reflect-metadata';
import '../setup';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { TrxNativeHandler } from '../../src/chain-wallet/asset-handlers/trx-native-handler';
import { Trc20TokenHandler } from '../../src/chain-wallet/asset-handlers/trc20-token-handler';
import { ConnectionManager } from '../../src/chain-wallet/shared/connection-manager';
import { Tron } from '../test-chains';
import BigNumber from 'bignumber.js';
import { ChainAssetType, ChainType } from '@delandlabs/hibit-basic-types';
import { ConsoleLogger, createAddress } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
// Import wallet to register address validator
import '../../src/chain-wallet/wallet';

// Mock decorators
vi.mock('../../src/chain-wallet/config', async () => {
  const actual = await vi.importActual('../../src/chain-wallet/config');
  return {
    ...actual,
    TronRetry: vi
      .fn()
      .mockImplementation(() => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        return descriptor;
      }),
    CacheAccountResources: vi
      .fn()
      .mockImplementation(() => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        return descriptor;
      }),
    CacheTokenInfo: vi
      .fn()
      .mockImplementation(() => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        return descriptor;
      }),
    RetryableCacheTokenDecimals: vi
      .fn()
      .mockImplementation(() => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        return descriptor;
      })
  };
});

describe('TrxNativeHandler', () => {
  let handler: TrxNativeHandler;
  let connectionManager: ConnectionManager;
  let mockLogger: any;
  let mockTronWeb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock logger
    mockLogger = new ConsoleLogger();
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});

    // Mock TronWeb instance
    mockTronWeb = {
      isAddress: vi.fn((address: string) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)),
      trx: {
        getBalance: vi.fn(),
        getAccountResources: vi.fn(),
        sign: vi.fn(),
        sendRawTransaction: vi.fn()
      },
      transactionBuilder: {
        sendTrx: vi.fn()
      }
    };

    // Mock connection manager
    connectionManager = new ConnectionManager(Tron, mockLogger);
    vi.spyOn(connectionManager, 'getTronWeb').mockReturnValue(mockTronWeb);
    vi.spyOn(connectionManager, 'getWallet').mockReturnValue({
      address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
      privateKey: 'mock-private-key',
      publicKey: new Uint8Array(33)
    });

    handler = new TrxNativeHandler(connectionManager, mockLogger);
  });

  describe('Asset Type', () => {
    test('should return correct asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.Native);
    });
  });

  describe('Balance Query', () => {
    test('should return balance for valid address', async () => {
      const mockBalance = '1500000'; // 1.5 TRX in sun
      mockTronWeb.trx.getBalance.mockResolvedValue(mockBalance);

      const balance = await handler.balanceOf({
        address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
        token: { assetType: ChainAssetType.Native }
      });

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('1500000'); // 1500000 sun = 1.5 TRX
      expect(mockTronWeb.trx.getBalance).toHaveBeenCalledWith('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9');
    });

    test('should handle errors during balance query', async () => {
      mockTronWeb.trx.getBalance.mockRejectedValue(new Error('Network timeout'));

      await expect(
        handler.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow();
    });
  });

  describe('Transfer', () => {
    test('should execute transfer successfully', async () => {
      const mockTransaction = { id: 'mock-tx-id' };
      const mockSignedTransaction = { ...mockTransaction, signature: 'mock-signature' };
      const mockBroadcastResult = { result: true, txid: 'mock-tx-hash' };

      mockTronWeb.transactionBuilder.sendTrx.mockResolvedValue(mockTransaction);
      mockTronWeb.trx.sign.mockResolvedValue(mockSignedTransaction);
      mockTronWeb.trx.sendRawTransaction.mockResolvedValue(mockBroadcastResult);

      const txId = await handler.transfer({
        recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
        amount: new BigNumber('1500000'), // 1500000 sun = 1.5 TRX
        token: { assetType: ChainAssetType.Native }
      });

      expect(txId).toBe('mock-tx-hash');
      expect(mockTronWeb.transactionBuilder.sendTrx).toHaveBeenCalledWith(
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        1500000,
        'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9'
      );
    });

    test('should handle transfer failure', async () => {
      const mockTransaction = { id: 'mock-tx-id' };
      const mockSignedTransaction = { ...mockTransaction, signature: 'mock-signature' };
      const mockBroadcastResult = { result: false, message: 'Insufficient balance' };

      mockTronWeb.transactionBuilder.sendTrx.mockResolvedValue(mockTransaction);
      mockTronWeb.trx.sign.mockResolvedValue(mockSignedTransaction);
      mockTronWeb.trx.sendRawTransaction.mockResolvedValue(mockBroadcastResult);

      await expect(
        handler.transfer({
          recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
          amount: new BigNumber('1000'),
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow('Insufficient balance');
    });

    test('should handle network errors during transfer', async () => {
      mockTronWeb.transactionBuilder.sendTrx.mockRejectedValue(new Error('Network timeout'));

      await expect(
        handler.transfer({
          recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
          amount: new BigNumber('1000000'), // 1000000 sun = 1 TRX
          token: { assetType: ChainAssetType.Native }
        })
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('Fee Estimation', () => {
    test('should estimate zero fee when sufficient bandwidth', async () => {
      const mockAccountResources = {
        freeNetUsed: 0,
        freeNetLimit: 5000
      };

      mockTronWeb.trx.getAccountResources.mockResolvedValue(mockAccountResources);

      const fee = await handler.estimateFee({
        recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
        amount: new BigNumber('1'),
        token: { assetType: ChainAssetType.Native }
      });

      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.toString()).toBe('0');
    });

    test('should estimate fee when bandwidth insufficient', async () => {
      const mockAccountResources = {
        freeNetUsed: 4900,
        freeNetLimit: 5000
      };

      mockTronWeb.trx.getAccountResources.mockResolvedValue(mockAccountResources);

      const fee = await handler.estimateFee({
        recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
        amount: new BigNumber('1'),
        token: { assetType: ChainAssetType.Native }
      });

      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.isGreaterThan(0)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup correctly', () => {
      handler.cleanup();
      // No specific assertions needed for cleanup
    });
  });
});

describe('Trc20TokenHandler', () => {
  let handler: Trc20TokenHandler;
  let connectionManager: ConnectionManager;
  let mockLogger: any;
  let mockTronWeb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock logger
    mockLogger = new ConsoleLogger();
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});

    // Mock TronWeb instance
    mockTronWeb = {
      isAddress: vi.fn((address: string) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)),
      trx: {
        getAccountResources: vi.fn()
      },
      contract: vi.fn().mockReturnValue({
        at: vi.fn()
      })
    };

    // Mock connection manager
    connectionManager = new ConnectionManager(Tron, mockLogger);
    vi.spyOn(connectionManager, 'getTronWeb').mockReturnValue(mockTronWeb);
    vi.spyOn(connectionManager, 'getWallet').mockReturnValue({
      address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
      privateKey: 'mock-private-key',
      publicKey: new Uint8Array(33)
    });

    handler = new Trc20TokenHandler(connectionManager, mockLogger);
  });

  describe('Asset Type', () => {
    test('should return correct asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.TRC20);
    });
  });

  describe('Balance Query', () => {
    test('should throw error when token address missing', async () => {
      await expect(
        handler.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toThrow(); // Runtime error when accessing undefined tokenAddress
    });

    test('should throw error for invalid token address', async () => {
      // Mock isAddress to return false for the invalid token address
      mockTronWeb.isAddress.mockImplementation((address: string) => {
        if (address === 'invalid-token-address') return false;
        return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address); // Keep default behavior for other addresses
      });

      await expect(
        handler.balanceOf({
          address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
          token: {
            assetType: ChainAssetType.TRC20,
            tokenAddress: 'invalid-token-address'
          }
        })
      ).rejects.toThrow(); // TronWeb will throw when invalid address is used
    });

    test('should return balance successfully', async () => {
      const mockBalance = new BigNumber('1000000000000000000'); // 1 token with 18 decimals
      const mockContract = {
        balanceOf: vi.fn().mockReturnValue({
          call: vi.fn().mockResolvedValue(mockBalance)
        }),
        decimals: vi.fn().mockReturnValue({
          call: vi.fn().mockResolvedValue(18)
        })
      };

      mockTronWeb.contract().at.mockResolvedValue(mockContract);

      const balance = await handler.balanceOf({
        address: createAddress('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', ChainType.Tron),
        token: {
          assetType: ChainAssetType.TRC20,
          tokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
        }
      });

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('1000000000000000000'); // 1e18 smallest units = 1 token with 18 decimals
    });
  });

  describe('Transfer', () => {
    test('should throw error when token address missing', async () => {
      await expect(
        handler.transfer({
          recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
          amount: new BigNumber('1000000'), // 1 token with 6 decimals
          token: { assetType: ChainAssetType.TRC20 }
        })
      ).rejects.toThrow(); // Runtime error when accessing undefined tokenAddress
    });

    test('should execute transfer successfully', async () => {
      const mockContract = {
        decimals: vi.fn().mockReturnValue({
          call: vi.fn().mockResolvedValue(6)
        }),
        transfer: vi.fn().mockReturnValue({
          send: vi.fn().mockResolvedValue('mock-tx-hash')
        })
      };

      mockTronWeb.contract().at.mockResolvedValue(mockContract);

      const txId = await handler.transfer({
        recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
        amount: new BigNumber('100500000'), // 100.5 tokens with 6 decimals
        token: {
          assetType: ChainAssetType.TRC20,
          tokenAddress: 'TJmmqjb1DK9TTZbQXzRQ2AuA94z4gKAPFa'
        }
      });

      expect(txId).toBe('mock-tx-hash');
      expect(mockContract.transfer).toHaveBeenCalledWith('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', '100500000');
    });

    test('should handle network errors during transfer', async () => {
      const mockContract = {
        decimals: vi.fn().mockReturnValue({
          call: vi.fn().mockResolvedValue(6)
        }),
        transfer: vi.fn().mockReturnValue({
          send: vi.fn().mockRejectedValue(new Error('Network timeout'))
        })
      };

      mockTronWeb.contract().at.mockResolvedValue(mockContract);

      await expect(
        handler.transfer({
          recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
          amount: new BigNumber('100'),
          token: {
            assetType: ChainAssetType.TRC20,
            tokenAddress: 'TJmmqjb1DK9TTZbQXzRQ2AuA94z4gKAPFa'
          }
        })
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('Fee Estimation', () => {
    test('should estimate zero fee when sufficient resources', async () => {
      const mockAccountResources = {
        EnergyLimit: 50000,
        EnergyUsed: 0,
        freeNetLimit: 5000,
        freeNetUsed: 0
      };

      mockTronWeb.trx.getAccountResources.mockResolvedValue(mockAccountResources);

      const fee = await handler.estimateFee({
        recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
        amount: new BigNumber('100'),
        token: {
          assetType: ChainAssetType.TRC20,
          tokenAddress: 'TJmmqjb1DK9TTZbQXzRQ2AuA94z4gKAPFa'
        }
      });

      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.toString()).toBe('0');
    });

    test('should estimate fee when resources insufficient', async () => {
      const mockAccountResources = {
        EnergyLimit: 1000,
        EnergyUsed: 0,
        freeNetLimit: 100,
        freeNetUsed: 0
      };

      mockTronWeb.trx.getAccountResources.mockResolvedValue(mockAccountResources);

      const fee = await handler.estimateFee({
        recipientAddress: createAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', ChainType.Tron),
        amount: new BigNumber('100'),
        token: {
          assetType: ChainAssetType.TRC20,
          tokenAddress: 'TJmmqjb1DK9TTZbQXzRQ2AuA94z4gKAPFa'
        }
      });

      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.isGreaterThan(0)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup correctly', () => {
      handler.cleanup();
      // No specific assertions needed for cleanup
    });
  });
});
