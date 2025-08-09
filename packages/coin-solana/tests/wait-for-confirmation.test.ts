import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SolanaChainWallet } from '../src/chain-wallet/wallet';
import { ConnectionManager } from '../src/chain-wallet/shared/connection-manager';
import { TransactionConfirmationParams } from '@delandlabs/coin-base';
import { createMockLogger, createMockChainInfo } from './test-utils';

// Mock minimal coin-base imports
vi.mock('@delandlabs/coin-base', async () => {
  const actual = await vi.importActual('@delandlabs/coin-base');
  return {
    ...actual
  };
});

// Mock crypto-lib
vi.mock('@delandlabs/crypto-lib', () => ({
  deriveEd25519PrivateKey: vi
    .fn()
    .mockResolvedValue('37df573b3ac4ad5b522e064e25b63ea16bcbe79d449e81a0268d1047948bb445'),
  EncodingFormat: { HEX: 'hex' },
  validateMnemonic: vi.fn().mockReturnValue(true),
  hexToBytes: vi.fn().mockImplementation((hex) => {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
  }),
  bytesToHex: vi.fn().mockImplementation((bytes: Uint8Array) =>
    Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  ),
  base: {
    toHex: vi.fn().mockImplementation((input: Uint8Array) =>
      Array.from(input)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
    ),
    fromHex: vi.fn().mockImplementation((hex) => {
      const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
      const bytes = new Uint8Array(cleanHex.length / 2);
      for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
      }
      return bytes;
    }),
    toUtf8: vi.fn().mockImplementation((input) => new TextEncoder().encode(input))
  }
}));

// Mock tweetnacl
vi.mock('tweetnacl', () => ({
  sign: {
    keyPair: {
      fromSeed: vi.fn().mockReturnValue({
        publicKey: new Uint8Array(32),
        secretKey: new Uint8Array(64)
      })
    },
    detached: vi.fn().mockReturnValue(new Uint8Array(64))
  }
}));

// Mock Solana Web3 dependencies
vi.mock('@solana/web3.js', () => ({
  Keypair: {
    fromSecretKey: vi.fn().mockReturnValue({
      publicKey: {
        toBase58: () => 'test-public-key',
        toBytes: () => new Uint8Array(32)
      },
      secretKey: new Uint8Array(64)
    })
  },
  PublicKey: vi.fn().mockImplementation((key) => ({
    toBase58: () => key,
    toString: () => key
  })),
  Connection: vi.fn().mockImplementation(() => ({
    getSignatureStatus: vi.fn(),
    getTransaction: vi.fn(),
    getBalance: vi.fn(),
    getFeeForMessage: vi.fn()
  }))
}));

describe('SolanaChainWallet - waitForConfirmation', () => {
  let wallet: SolanaChainWallet;
  let mockConnectionManager: ConnectionManager;

  beforeEach(async () => {
    vi.useFakeTimers();

    const chainInfo = createMockChainInfo();
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    // Create wallet with WebSocket disabled for predictable testing
    wallet = new SolanaChainWallet(chainInfo, mnemonic, {
      logger: createMockLogger(),
      confirmationStrategy: {
        useWebSocket: false,
        fallbackToPolling: true
      }
    });

    // Get the connection manager instance to mock its methods
    mockConnectionManager = (wallet as any).connectionManager;

    // Wait for wallet initialization
    await vi.runAllTimersAsync();
  });

  afterEach(() => {
    vi.useRealTimers();
    wallet.destroy();
  });

  describe('waitForConfirmation', () => {
    it('should return confirmed result when transaction is finalized', async () => {
      // Mock successful confirmation status
      const mockSignatureStatus = {
        err: null,
        confirmationStatus: 'finalized' as any,
        slot: 12345,
        confirmations: 10
      } as any;

      const mockTransactionDetails = {
        slot: 12345,
        meta: {
          fee: 5000
        }
      } as any;

      vi.spyOn(mockConnectionManager, 'getSignatureStatus').mockResolvedValue(mockSignatureStatus);
      vi.spyOn(mockConnectionManager, 'getTransactionDetails').mockResolvedValue(mockTransactionDetails);

      const params: TransactionConfirmationParams = {
        txHash: 'test-signature',
        requiredConfirmations: 1,
        timeoutMs: 10000
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.status).toBe('confirmed');
      expect(result.confirmations).toBe(10); // Finalized = 10 confirmations
      expect(result.blockNumber).toBe(12345);
    });

    it('should return failed result when transaction has error', async () => {
      // Mock failed transaction status
      const mockSignatureStatus = {
        err: { InstructionError: [0, 'Custom error'] },
        confirmationStatus: null,
        slot: 12345,
        confirmations: 0
      } as any;

      vi.spyOn(mockConnectionManager, 'getSignatureStatus').mockResolvedValue(mockSignatureStatus);

      const params: TransactionConfirmationParams = {
        txHash: 'test-signature',
        requiredConfirmations: 1,
        timeoutMs: 10000
      };

      const result = await wallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.confirmations).toBe(0);
    });

    it('should return timeout result when timeout is reached', async () => {
      // Mock transaction not found
      vi.spyOn(mockConnectionManager, 'getSignatureStatus').mockResolvedValue(null);

      const params: TransactionConfirmationParams = {
        txHash: 'test-signature',
        requiredConfirmations: 1,
        timeoutMs: 1000 // Short timeout
      };

      // Start the confirmation check
      const resultPromise = wallet.waitForConfirmation(params);

      // Fast forward time to exceed timeout and run all pending timers
      vi.advanceTimersByTime(1500);
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.isConfirmed).toBe(false);
      expect(result.status).toBe('timeout');
    });

    it('should call progress callback during confirmation process', async () => {
      const mockSignatureStatus = {
        err: null,
        confirmationStatus: 'confirmed',
        slot: 12345,
        confirmations: 3
      } as any;

      const mockTransactionDetails = {
        slot: 12345,
        meta: { fee: 5000 }
      } as any;

      vi.spyOn(mockConnectionManager, 'getSignatureStatus').mockResolvedValue(mockSignatureStatus);
      vi.spyOn(mockConnectionManager, 'getTransactionDetails').mockResolvedValue(mockTransactionDetails);

      const onConfirmationUpdate = vi.fn();
      const params: TransactionConfirmationParams = {
        txHash: 'test-signature',
        requiredConfirmations: 3,
        timeoutMs: 10000,
        onConfirmationUpdate
      };

      await wallet.waitForConfirmation(params);

      expect(onConfirmationUpdate).toHaveBeenCalledWith(3, 3);
    });
  });

  describe('WebSocket confirmation', () => {
    let walletWithWebSocket: SolanaChainWallet;

    beforeEach(async () => {
      const chainInfo = createMockChainInfo();
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

      // Create wallet with WebSocket enabled
      walletWithWebSocket = new SolanaChainWallet(chainInfo, mnemonic, {
        logger: createMockLogger(),
        confirmationStrategy: {
          useWebSocket: true,
          fallbackToPolling: true
        }
      });

      // Mock WebSocket subscription
      mockConnectionManager = (walletWithWebSocket as any).connectionManager;

      // Wait for wallet initialization
      await vi.runAllTimersAsync();
    });

    afterEach(() => {
      walletWithWebSocket.destroy();
    });

    it('should use WebSocket for real-time confirmation', async () => {
      const mockSubscriptionId = 123;

      // Mock successful WebSocket subscription with Promise-based callback
      vi.spyOn(mockConnectionManager, 'subscribeSignatureStatus').mockImplementation(async (_signature, callback) => {
        // Use Promise.resolve to ensure callback runs in next tick
        Promise.resolve().then(() => {
          callback({
            err: null,
            confirmationStatus: 'confirmed',
            slot: 12345,
            confirmations: null
          });
        });
        return mockSubscriptionId;
      });

      vi.spyOn(mockConnectionManager, 'unsubscribeSignatureStatus').mockResolvedValue(undefined);

      const mockTransactionDetails = {
        slot: 12345,
        meta: { fee: 5000 }
      } as any;

      vi.spyOn(mockConnectionManager, 'getTransactionDetails').mockResolvedValue(mockTransactionDetails);

      const params: TransactionConfirmationParams = {
        txHash: 'test-signature',
        requiredConfirmations: 3,
        timeoutMs: 5000
      };

      const result = await walletWithWebSocket.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.confirmations).toBe(3);
      expect(mockConnectionManager.unsubscribeSignatureStatus).toHaveBeenCalledWith(mockSubscriptionId);
    });

    it('should fall back to polling on WebSocket error', async () => {
      // Mock WebSocket subscription failure
      vi.spyOn(mockConnectionManager, 'subscribeSignatureStatus').mockResolvedValue(null);

      // Mock polling response
      const mockSignatureStatus = {
        err: null,
        confirmationStatus: 'finalized',
        slot: 12345,
        confirmations: 10
      } as any;

      const mockTransactionDetails = {
        slot: 12345,
        meta: { fee: 5000 }
      } as any;

      vi.spyOn(mockConnectionManager, 'getSignatureStatus').mockResolvedValue(mockSignatureStatus);
      vi.spyOn(mockConnectionManager, 'getTransactionDetails').mockResolvedValue(mockTransactionDetails);

      const params: TransactionConfirmationParams = {
        txHash: 'test-signature',
        requiredConfirmations: 1,
        timeoutMs: 10000
      };

      const result = await walletWithWebSocket.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.confirmations).toBe(10);
      // Verify it used polling (getSignatureStatus was called)
      expect(mockConnectionManager.getSignatureStatus).toHaveBeenCalled();
    });
  });

  describe('Custom confirmation strategies', () => {
    it('should use custom commitment mapping', async () => {
      const chainInfo = createMockChainInfo();
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

      // Create wallet with custom mapping
      const customWallet = new SolanaChainWallet(chainInfo, mnemonic, {
        logger: createMockLogger(),
        confirmationStrategy: {
          useWebSocket: false,
          customCommitmentMapping: {
            processed: 2,
            confirmed: 5,
            finalized: 15
          }
        }
      });

      const customConnectionManager = (customWallet as any).connectionManager;

      await vi.runAllTimersAsync();

      // Mock confirmed status
      const mockSignatureStatus = {
        err: null,
        confirmationStatus: 'confirmed',
        slot: 12345
      } as any;

      const mockTransactionDetails = {
        slot: 12345,
        meta: { fee: 5000 }
      } as any;

      vi.spyOn(customConnectionManager, 'getSignatureStatus').mockResolvedValue(mockSignatureStatus);
      vi.spyOn(customConnectionManager, 'getTransactionDetails').mockResolvedValue(mockTransactionDetails);

      const params: TransactionConfirmationParams = {
        txHash: 'test-signature',
        requiredConfirmations: 5,
        timeoutMs: 10000
      };

      const result = await customWallet.waitForConfirmation(params);

      expect(result.isConfirmed).toBe(true);
      expect(result.confirmations).toBe(5); // Custom mapping for 'confirmed'

      customWallet.destroy();
    });
  });
});
