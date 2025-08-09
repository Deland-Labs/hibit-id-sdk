import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SplTokenHandler } from '../../src/chain-wallet/asset-handlers/spl-token-handler';
import { ConnectionManager } from '../../src/chain-wallet/shared/connection-manager';
import { BalanceQueryParams, TransferParams } from '@delandlabs/coin-base';
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

// Mock SPL Token dependencies
vi.mock('@solana/spl-token', () => ({
  getAccount: vi.fn(),
  getAssociatedTokenAddress: vi.fn(),
  createAssociatedTokenAccountInstruction: vi.fn(),
  getMint: vi.fn(),
  TokenAccountNotFoundError: class extends Error {
    constructor() {
      super('Token account not found');
    }
  },
  createTransferInstruction: vi.fn()
}));

vi.mock('@solana/web3.js', () => ({
  PublicKey: vi.fn().mockImplementation((key) => {
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
  }),
  Transaction: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    compileMessage: vi.fn()
  })),
  ComputeBudgetProgram: {
    setComputeUnitPrice: vi.fn()
  },
  LAMPORTS_PER_SOL: 1000000000
}));

describe('SplTokenHandler', () => {
  let connectionManager: ConnectionManager;
  let handler: SplTokenHandler;
  let mockConnection: any;
  let mockKeypair: any;

  beforeEach(() => {
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

    handler = new SplTokenHandler(connectionManager, createMockLogger());
  });

  describe('balanceOf', () => {
    it('should get SPL token balance successfully', async () => {
      const { getAccount, getAssociatedTokenAddress, getMint } = await import('@solana/spl-token');

      // Mock token account with balance
      (getAccount as any).mockResolvedValue({
        amount: BigInt('1000000') // 1 token with 6 decimals
      });

      (getAssociatedTokenAddress as any).mockResolvedValue('token-account-address');

      // Mock mint info for decimals
      (getMint as any).mockResolvedValue({
        decimals: 6
      });

      const params: BalanceQueryParams = {
        address: createSolanaAddress('11111111111111111111111111111112'),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111112'
        }
      };

      const balance = await handler.balanceOf(params);

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('1000000'); // 1000000 smallest units = 1 token with 6 decimals
    });

    it('should return zero balance when token account not found', async () => {
      const { getAccount, getAssociatedTokenAddress, TokenAccountNotFoundError } = await import('@solana/spl-token');

      (getAssociatedTokenAddress as any).mockResolvedValue('token-account-address');
      (getAccount as any).mockRejectedValue(new (TokenAccountNotFoundError as any)());

      const params: BalanceQueryParams = {
        address: createSolanaAddress('11111111111111111111111111111112'),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111112'
        }
      };

      const balance = await handler.balanceOf(params);

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('0');
    });

    it('should throw error when token address is missing', async () => {
      const params: BalanceQueryParams = {
        address: createSolanaAddress('11111111111111111111111111111112'),
        token: { assetType: ChainAssetType.SPL }
      };

      await expect(handler.balanceOf(params)).rejects.toThrow('Invalid public key input');
    });
  });

  describe('transfer', () => {
    it('should transfer SPL tokens successfully', async () => {
      const { getAssociatedTokenAddress, getMint, getAccount, createTransferInstruction } = await import(
        '@solana/spl-token'
      );

      (getAssociatedTokenAddress as any).mockResolvedValue('token-account-address');
      (getMint as any).mockResolvedValue({ decimals: 6 });
      (getAccount as any).mockResolvedValue({ amount: BigInt('1000000') });
      (createTransferInstruction as any).mockReturnValue({});

      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111112'
        }
      };

      const signature = await handler.transfer(params);

      expect(signature).toBe('test-signature');
      expect(connectionManager.sendAndConfirmTransaction).toHaveBeenCalled();
    });

    it('should create associated token account if needed', async () => {
      const {
        getAssociatedTokenAddress,
        getMint,
        getAccount,
        TokenAccountNotFoundError,
        createAssociatedTokenAccountInstruction,
        createTransferInstruction
      } = await import('@solana/spl-token');

      (getAssociatedTokenAddress as any).mockResolvedValue('token-account-address');
      (getMint as any).mockResolvedValue({ decimals: 6 });
      (createAssociatedTokenAccountInstruction as any).mockReturnValue({});
      (createTransferInstruction as any).mockReturnValue({});

      // Mock that recipient doesn't have token account
      (getAccount as any).mockRejectedValue(new (TokenAccountNotFoundError as any)());

      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111112'
        }
      };

      const signature = await handler.transfer(params);

      expect(signature).toBe('test-signature');
      expect(createAssociatedTokenAccountInstruction).toHaveBeenCalled();
    });

    it('should throw error when token address is missing', async () => {
      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.SPL }
      };

      await expect(handler.transfer(params)).rejects.toThrow('Invalid public key input');
    });
  });

  describe('estimateFee', () => {
    it('should estimate fee without account creation', async () => {
      const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');

      (getAssociatedTokenAddress as any).mockResolvedValue('token-account-address');
      (getAccount as any).mockResolvedValue({ amount: BigInt('1000000') });

      mockConnection.getFeeForMessage.mockResolvedValue({ value: 5000 });

      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111112'
        }
      };

      const fee = await handler.estimateFee(params);

      expect(fee).toBeInstanceOf(BigNumber);
      expect(mockConnection.getFeeForMessage).toHaveBeenCalled();
    });

    it('should include rent exemption when account creation is needed', async () => {
      const { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } = await import('@solana/spl-token');

      (getAssociatedTokenAddress as any).mockResolvedValue('token-account-address');
      (getAccount as any).mockRejectedValue(new (TokenAccountNotFoundError as any)());

      mockConnection.getFeeForMessage.mockResolvedValue({ value: 5000 });
      mockConnection.getMinimumBalanceForRentExemption.mockResolvedValue(2039280); // Typical rent for token account

      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111112'
        }
      };

      const fee = await handler.estimateFee(params);

      expect(fee).toBeInstanceOf(BigNumber);
      expect(mockConnection.getMinimumBalanceForRentExemption).toHaveBeenCalled();
    });

    it('should throw error when token address is missing', async () => {
      const params: TransferParams = {
        recipientAddress: createSolanaAddress('11111111111111111111111111111112'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.SPL }
      };

      await expect(handler.estimateFee(params)).rejects.toThrow('Invalid public key input');
    });
  });

  describe('asset type', () => {
    it('should return SPL asset type', () => {
      expect(handler.getAssetType()).toBe(ChainAssetType.SPL);
    });
  });

  describe('cleanup', () => {
    it('should cleanup without errors', () => {
      expect(() => handler.cleanup()).not.toThrow();
    });
  });
});
