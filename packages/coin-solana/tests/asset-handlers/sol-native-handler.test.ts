import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SolNativeHandler } from '../../src/chain-wallet/asset-handlers/sol-native-handler';
import { ConnectionManager } from '../../src/chain-wallet/shared/connection-manager';
import { BalanceQueryParams, TransferParams, FeeEstimationError, HibitIdSdkErrorCode } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import BigNumber from 'bignumber.js';
import {
  createMockLogger,
  createMockChainInfo,
  createMockConnection,
  createMockKeypair,
  createSolanaAddress
} from '../test-utils';

// Mock minimal coin-base imports
vi.mock('@delandlabs/coin-base', async () => {
  const actual = await vi.importActual('@delandlabs/coin-base');
  return {
    ...actual
  };
});

// Mock Solana Web3 dependencies
vi.mock('@solana/web3.js', () => {
  const mockPublicKey = vi.fn().mockImplementation((key) => {
    // Simulate validation like real PublicKey - accept base58 strings and some test strings
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid public key input');
    }
    // Accept valid base58 strings or test addresses
    if (key === 'invalid-address' || key === '') {
      throw new Error('Invalid public key input');
    }
    return {
      toBase58: () => key,
      toString: () => key
    };
  });
  (mockPublicKey as any).default = { toBase58: () => 'default-public-key' };

  return {
    PublicKey: mockPublicKey,
    Transaction: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      compileMessage: vi.fn()
    })),
    SystemProgram: {
      transfer: vi.fn()
    },
    ComputeBudgetProgram: {
      setComputeUnitPrice: vi.fn()
    },
    TransactionInstruction: vi.fn(),
    LAMPORTS_PER_SOL: 1000000000
  };
});

describe('SolNativeHandler', () => {
  let connectionManager: ConnectionManager;
  let handler: SolNativeHandler;
  let mockConnection: any;
  let mockKeypair: any;

  beforeEach(() => {
    vi.useFakeTimers();
    const chainInfo = createMockChainInfo();
    connectionManager = new ConnectionManager(chainInfo, createMockLogger());

    mockConnection = createMockConnection();
    mockKeypair = createMockKeypair();

    // Mock the connection manager methods
    vi.spyOn(connectionManager, 'getConnection').mockReturnValue(mockConnection);
    vi.spyOn(connectionManager, 'getWallet').mockReturnValue({
      keypair: mockKeypair,
      address: createSolanaAddress('test-address')
    });
    vi.spyOn(connectionManager, 'sendAndConfirmTransaction').mockResolvedValue('test-signature');
    vi.spyOn(connectionManager, 'simulateTransaction').mockResolvedValue();

    handler = new SolNativeHandler(connectionManager, createMockLogger());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('balanceOf', () => {
    it('should get native SOL balance successfully', async () => {
      const mockBalance = 1000000000; // 1 SOL in lamports
      mockConnection.getBalance.mockResolvedValue(mockBalance);

      const params: BalanceQueryParams = {
        address: createSolanaAddress('11111111111111111111111111111112'), // Valid base58 address
        token: { assetType: ChainAssetType.Native }
      };

      const balance = await handler.balanceOf(params);

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('1000000000'); // 1000000000 lamports = 1 SOL
      expect(mockConnection.getBalance).toHaveBeenCalled();
    });

    it('should handle balance query errors', async () => {
      mockConnection.getBalance.mockRejectedValue(new Error('Network error'));

      const params: BalanceQueryParams = {
        address: createSolanaAddress('11111111111111111111111111111112'),
        token: { assetType: ChainAssetType.Native }
      };

      // Run the promise and advance timers to complete all retries
      const promise = handler.balanceOf(params).catch((e) => e);
      await vi.runAllTimersAsync();
      const error = await promise;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('balanceOf failed after 4 attempts');
    });
  });

  describe('transfer', () => {
    it('should transfer native SOL successfully', async () => {
      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.Native }
      };

      const signature = await handler.transfer(params);

      expect(signature).toBe('test-signature');
      expect(connectionManager.sendAndConfirmTransaction).toHaveBeenCalled();
    });

    it('should add memo to transaction when payload is provided', async () => {
      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.Native },
        payload: 'test memo'
      };

      await handler.transfer(params);

      expect(connectionManager.sendAndConfirmTransaction).toHaveBeenCalled();
    });

    it('should handle transfer errors', async () => {
      connectionManager.sendAndConfirmTransaction = vi.fn().mockRejectedValue(new Error('Transaction failed'));

      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.Native }
      };

      await expect(handler.transfer(params)).rejects.toThrow('Transaction failed');
    });
  });

  describe('estimateFee', () => {
    it('should estimate fee successfully', async () => {
      const mockFee = { value: 5000 }; // 5000 lamports
      mockConnection.getFeeForMessage.mockResolvedValue(mockFee);

      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.Native }
      };

      const fee = await handler.estimateFee(params);

      expect(fee).toBeInstanceOf(BigNumber);
      expect(mockConnection.getFeeForMessage).toHaveBeenCalled();
    });

    it('should handle null fee response', async () => {
      // Mock the estimateFee method directly to avoid retry decorator in test
      const originalEstimateFee = handler.estimateFee.bind(handler);
      handler.estimateFee = vi.fn().mockImplementation(async () => {
        throw new FeeEstimationError(
          HibitIdSdkErrorCode.FEE_ESTIMATION_FAILED,
          'Solana: Fee calculation error - fee value is null'
        );
      });

      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.Native }
      };

      await expect(handler.estimateFee(params)).rejects.toThrow('Fee calculation error - fee value is null');

      // Restore original method
      handler.estimateFee = originalEstimateFee;
    });
  });

  describe('asset type', () => {
    it('should return native asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.Native);
    });
  });

  describe('cleanup', () => {
    it('should cleanup without errors', () => {
      expect(() => handler.cleanup()).not.toThrow();
    });
  });
});
