import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionManager } from '../src/chain-wallet/shared/connection-manager';
import { createMockChainInfo, createMockLogger, createSolanaAddress } from './test-utils';

// Mock Solana Web3
vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn().mockImplementation((url, commitment) => ({
    url,
    commitment,
    simulateTransaction: vi.fn(),
    sendTransaction: vi.fn()
  })),
  sendAndConfirmTransaction: vi.fn()
}));

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let mockKeypair: any;

  beforeEach(() => {
    const chainInfo = createMockChainInfo();
    connectionManager = new ConnectionManager(chainInfo, createMockLogger());

    mockKeypair = {
      publicKey: {
        toBase58: () => 'test-public-key'
      },
      secretKey: new Uint8Array(64)
    };
  });

  describe('initialization', () => {
    it('should initialize with wallet info', () => {
      const walletInfo = {
        keypair: mockKeypair,
        address: createSolanaAddress('test-address')
      };

      expect(() => connectionManager.initialize(walletInfo)).not.toThrow();
      expect(connectionManager.isInitialized()).toBe(true);
    });

    it('should throw error when RPC URL is missing', () => {
      const invalidChainInfo = {
        ...createMockChainInfo(),
        rpc: {}
      };
      const invalidManager = new ConnectionManager(invalidChainInfo as any, createMockLogger());

      const walletInfo = {
        keypair: mockKeypair,
        address: createSolanaAddress('test-address')
      };

      expect(() => invalidManager.initialize(walletInfo)).toThrow('RPC URL must be provided');
    });
  });

  describe('connection access', () => {
    beforeEach(() => {
      connectionManager.initialize({
        keypair: mockKeypair,
        address: createSolanaAddress('test-address')
      });
    });

    it('should provide connection instance', () => {
      const connection = connectionManager.getConnection();
      expect(connection).toBeDefined();
    });

    it('should provide wallet info', () => {
      const wallet = connectionManager.getWallet();
      expect(wallet.address).toBe('test-address');
      expect(wallet.keypair).toBe(mockKeypair);
    });

    it('should throw error when not initialized', () => {
      const uninitializedManager = new ConnectionManager(createMockChainInfo(), createMockLogger());

      expect(() => uninitializedManager.getConnection()).toThrow('Connection not initialized');
      expect(() => uninitializedManager.getWallet()).toThrow('Wallet not initialized');
    });
  });

  describe('transaction management', () => {
    beforeEach(() => {
      connectionManager.initialize({
        keypair: mockKeypair,
        address: createSolanaAddress('test-address')
      });
    });

    it('should send and confirm transaction', async () => {
      const { sendAndConfirmTransaction } = await import('@solana/web3.js');
      (sendAndConfirmTransaction as any).mockResolvedValue('test-signature');

      const mockTransaction = { add: vi.fn() };
      const signature = await connectionManager.sendAndConfirmTransaction(mockTransaction as any);

      expect(signature).toBe('test-signature');
      expect(sendAndConfirmTransaction).toHaveBeenCalled();
    });

    it('should simulate transaction successfully', async () => {
      const mockConnection = connectionManager.getConnection();
      vi.spyOn(mockConnection, 'simulateTransaction').mockResolvedValue({
        context: { slot: 123456 },
        value: { err: null, logs: ['success'] }
      });

      const mockTransaction = { add: vi.fn() };

      await expect(connectionManager.simulateTransaction(mockTransaction as any)).resolves.not.toThrow();
    });

    it('should handle simulation errors', async () => {
      const mockConnection = connectionManager.getConnection();
      vi.spyOn(mockConnection, 'simulateTransaction').mockResolvedValue({
        context: { slot: 123456 },
        value: {
          err: { InstructionError: [0, 'Custom program error'] },
          logs: ['error']
        }
      });

      const mockTransaction = { add: vi.fn() };

      await expect(connectionManager.simulateTransaction(mockTransaction as any)).rejects.toThrow(
        'Transaction simulation failed'
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      connectionManager.initialize({
        keypair: mockKeypair,
        address: createSolanaAddress('test-address')
      });

      expect(connectionManager.isInitialized()).toBe(true);

      await connectionManager.cleanup();
      expect(connectionManager.isInitialized()).toBe(false);
    });
  });
});
