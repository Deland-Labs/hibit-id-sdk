import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BigNumber from 'bignumber.js';
import { IcrcTokenHandler } from '../../src/chain-wallet/asset-handlers/icrc-token-handler';
import { AgentManager } from '../../src/chain-wallet/shared/agent-manager';
import {
  ILogger,
  BalanceQueryParams,
  TransferParams,
  BalanceQueryError,
  TransactionError
} from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { createMockLogger, createMockAgent, createMockAgentManager, createMockIcrcLedger } from '../test-helpers';

// Mock the modules
vi.mock('@dfinity/ledger-icrc');
vi.mock('ic0', () => ({
  default: vi.fn()
}));

import ic from 'ic0';

describe('IcrcTokenHandler', () => {
  let handler: IcrcTokenHandler;
  let mockAgentManager: Partial<AgentManager>;
  let mockLogger: ILogger;
  let mockLedger: ReturnType<typeof createMockIcrcLedger>;
  let mockAgent: ReturnType<typeof createMockAgent>;
  let mockIc0: any;

  const testToken = {
    assetType: ChainAssetType.ICRC3,
    tokenAddress: 'be2us-64aaa-aaaaa-qaabq-cai'
  } as const;

  beforeEach(() => {
    // Setup mocks
    mockLogger = createMockLogger();
    mockAgent = createMockAgent();
    mockAgentManager = createMockAgentManager(mockAgent);
    mockLedger = createMockIcrcLedger();

    // Mock IcrcLedgerCanister
    vi.mocked(IcrcLedgerCanister.create).mockReturnValue(mockLedger as any);

    // Mock ic0
    mockIc0 = {
      call: vi.fn()
    };
    vi.mocked(ic).mockReturnValue(mockIc0);

    // Default mock for ICRC-3 support check - returns ICRC-3 support
    mockIc0.call.mockResolvedValue([
      { name: 'ICRC-1', url: 'https://...' },
      { name: 'ICRC-3', url: 'https://...' }
    ]);

    // Create handler instance
    handler = new IcrcTokenHandler(mockAgentManager as AgentManager, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAssetType', () => {
    it('should return ICRC3 asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.ICRC3);
    });
  });

  describe('balanceOf', () => {
    it('should throw error for AccountIdentifier address format', async () => {
      const invalidParams = {
        address: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        token: testToken
      } as BalanceQueryParams;

      await expect(handler.balanceOf(invalidParams)).rejects.toThrow(BalanceQueryError);
    });

    // 余额查询功能测试已简化 - 装饰器和ICRC-3支持检查行为已在coin-base中测试
  });

  describe('transfer', () => {
    it('should throw error for invalid recipient address (AccountIdentifier format)', async () => {
      const invalidParams = {
        recipientAddress: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        amount: new BigNumber('1'),
        token: testToken
      } as TransferParams;

      await expect(handler.transfer(invalidParams)).rejects.toThrow(TransactionError);
    });

    it('should handle transfer successfully', async () => {
      // Setup
      const mockBlockIndex = BigInt(12345);
      mockLedger.transfer.mockResolvedValue(mockBlockIndex);

      // Mock metadata for decimals
      mockLedger.metadata.mockResolvedValue([['icrc1:decimals', { Nat: BigInt(8) }]]);

      const validParams = {
        recipientAddress: 'be2us-64aaa-aaaaa-qaabq-cai',
        amount: new BigNumber('1'),
        token: testToken
      } as TransferParams;

      const result = await handler.transfer(validParams);

      expect(result).toBe('12345');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('transfer completed successfully'),
        expect.objectContaining({
          context: 'IcrcTokenHandler.transfer'
        })
      );
    });

    // 转账功能测试已简化 - 装饰器行为已在coin-base中测试
  });

  describe('estimateFee', () => {
    it('should estimate fee successfully', async () => {
      // Setup
      const mockFee = BigInt(10000); // 0.0001 ICRC token
      mockLedger.transactionFee.mockResolvedValue(mockFee);

      // Mock metadata for decimals
      mockLedger.metadata.mockResolvedValue([['icrc1:decimals', { Nat: BigInt(8) }]]);

      const feeParams = {
        recipientAddress: 'be2us-64aaa-aaaaa-qaabq-cai',
        amount: new BigNumber('1'),
        token: testToken
      } as TransferParams;

      const fee = await handler.estimateFee(feeParams);

      expect(fee.toString()).toBe('10000'); // 0.0001 ICP = 10000 e8s (smallest unit)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('fee estimated'),
        expect.objectContaining({
          context: 'IcrcTokenHandler.estimateFee'
        })
      );
    });
    // 费用估算功能测试已简化 - 装饰器行为已在coin-base中测试
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      // Create some cached ledgers first with valid canister IDs
      (handler as any).getIcrcLedger('ryjl3-tyaaa-aaaaa-aaaba-cai');
      (handler as any).getIcrcLedger('be2us-64aaa-aaaaa-qaabq-cai');

      // Check cache size before cleanup
      const cacheSize = (handler as any).ledgerCache.size;
      expect(cacheSize).toBe(2);

      // Cleanup
      handler.cleanup();

      // Check cache is cleared
      expect((handler as any).ledgerCache.size).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ICRC token handler resources cleaned up',
        expect.objectContaining({
          context: 'IcrcTokenHandler.cleanup'
        })
      );
    });
  });
});
