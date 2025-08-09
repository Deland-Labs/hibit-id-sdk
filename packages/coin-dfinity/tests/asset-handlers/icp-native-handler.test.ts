import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BigNumber from 'bignumber.js';
import { IcpNativeHandler } from '../../src/chain-wallet/asset-handlers/icp-native-handler';
import { AgentManager } from '../../src/chain-wallet/shared/agent-manager';
import { ILogger, BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { LedgerCanister } from '@dfinity/ledger-icp';
import { createMockLogger, createMockAgent, createMockAgentManager, createMockLedger } from '../test-helpers';

// Mock only LedgerCanister, keep other exports like AccountIdentifier unmocked
vi.mock('@dfinity/ledger-icp', async () => {
  const actual = await vi.importActual('@dfinity/ledger-icp');
  return {
    ...actual,
    LedgerCanister: {
      create: vi.fn()
    }
  };
});

describe('IcpNativeHandler', () => {
  let handler: IcpNativeHandler;
  let mockAgentManager: Partial<AgentManager>;
  let mockLogger: ILogger;
  let mockLedger: ReturnType<typeof createMockLedger>;
  let mockAgent: ReturnType<typeof createMockAgent>;

  beforeEach(() => {
    // Setup mocks
    mockLogger = createMockLogger();
    mockAgent = createMockAgent();
    mockAgentManager = createMockAgentManager(mockAgent);
    mockLedger = createMockLedger();

    // Mock LedgerCanister
    vi.mocked(LedgerCanister.create).mockReturnValue(mockLedger as any);

    // Create handler instance
    handler = new IcpNativeHandler(mockAgentManager as AgentManager, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAssetType', () => {
    it('should return ICP asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.ICP);
    });
  });

  describe('balanceOf', () => {
    it('should handle balance query in e8s (smallest unit)', async () => {
      // Setup
      const mockBalance = BigInt(100000000); // 1 ICP in e8s
      mockLedger.accountBalance.mockResolvedValue(mockBalance);

      const validParams = {
        address: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        token: { assetType: ChainAssetType.ICP }
      } as BalanceQueryParams;

      const balance = await handler.balanceOf(validParams);

      // Should return e8s, not ICP (1 ICP = 100000000 e8s)
      expect(balance.toString()).toBe(mockBalance.toString());
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('balance retrieved'),
        expect.objectContaining({
          context: 'IcpNativeHandler.balanceOf'
        })
      );
    });

    // 余额查询功能测试已简化 - 装饰器行为已在coin-base中测试
  });

  describe('transfer', () => {
    it('should handle transfer with e8s amount', async () => {
      // Setup
      const mockBlockHeight = BigInt(12345);
      mockLedger.transfer.mockResolvedValue(mockBlockHeight);

      // Amount is now in e8s (smallest unit) - 1 ICP = 100000000 e8s
      const amountInE8s = '100000000';
      const validParams = {
        recipientAddress: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        amount: new BigNumber(amountInE8s),
        token: { assetType: ChainAssetType.ICP }
      } as TransferParams;

      const result = await handler.transfer(validParams);

      expect(result).toBe('12345');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('transfer completed successfully'),
        expect.objectContaining({
          context: 'IcpNativeHandler.transfer'
        })
      );
    });

    // 转账功能测试已简化 - 装饰器行为已在coin-base中测试
  });

  describe('estimateFee', () => {
    it('should estimate fee successfully', async () => {
      // Setup
      const mockFee = BigInt(10000); // 0.0001 ICP
      mockLedger.transactionFee.mockResolvedValue(mockFee);

      const feeParams = {
        recipientAddress: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        amount: new BigNumber('1'),
        token: { assetType: ChainAssetType.ICP }
      } as TransferParams;

      const fee = await handler.estimateFee(feeParams);

      expect(fee.toString()).toBe('10000'); // 0.0001 ICP = 10000 e8s (smallest unit)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('fee estimated'),
        expect.objectContaining({
          context: 'IcpNativeHandler.estimateFee'
        })
      );
    });

    // 费用估算错误处理测试已简化 - 装饰器行为已在coin-base中测试
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      handler.cleanup();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ICP native handler resources cleaned up',
        expect.objectContaining({
          context: 'IcpNativeHandler.cleanup'
        })
      );
    });
  });
});
