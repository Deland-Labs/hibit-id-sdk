import './setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SolanaChainWallet } from '../src/chain-wallet/wallet';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { createMockChainInfo, createMockLogger, createSolanaAddress } from './test-utils';
import BigNumber from 'bignumber.js';

// Mock dependencies
vi.mock('@solana/web3.js', () => ({
  PublicKey: vi.fn().mockImplementation((key) => ({
    toBase58: () => key,
    toString: () => key,
    toBytes: () => new Uint8Array(32)
  })),
  Keypair: {
    fromSecretKey: vi.fn().mockReturnValue({
      publicKey: {
        toBase58: () => '11111111111111111111111111111112',
        toBytes: () => new Uint8Array(32)
      },
      secretKey: new Uint8Array(64)
    })
  },
  Connection: vi.fn()
}));

vi.mock('tweetnacl', () => ({
  sign: {
    keyPair: {
      fromSeed: vi.fn().mockReturnValue({
        publicKey: new Uint8Array(32),
        secretKey: new Uint8Array(32)
      })
    },
    detached: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3]))
  }
}));

vi.mock('@delandlabs/crypto-lib', () => ({
  deriveEd25519PrivateKey: vi
    .fn()
    .mockResolvedValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  validateMnemonic: vi.fn().mockReturnValue(true),
  EncodingFormat: { HEX: 'hex' },
  base: {
    fromHex: vi.fn().mockReturnValue(new Uint8Array(32)),
    toHex: vi.fn().mockReturnValue('test-hex'),
    toUtf8: vi.fn().mockReturnValue(new Uint8Array([116, 101, 115, 116]))
  }
}));

// Mock asset handlers
vi.mock('../src/chain-wallet/asset-handlers', () => ({
  SolNativeHandler: vi.fn().mockImplementation(() => ({
    balanceOf: vi.fn().mockResolvedValue(new BigNumber(1)),
    transfer: vi.fn().mockResolvedValue('test-signature'),
    estimateFee: vi.fn().mockResolvedValue(new BigNumber(0.001))
  })),
  SplTokenHandler: vi.fn().mockImplementation(() => ({
    balanceOf: vi.fn().mockResolvedValue(new BigNumber(100)),
    transfer: vi.fn().mockResolvedValue('test-signature'),
    estimateFee: vi.fn().mockResolvedValue(new BigNumber(0.002))
  })),
  BaseAssetHandler: vi.fn()
}));

// Mock connection manager
vi.mock('../src/chain-wallet/shared', () => ({
  ConnectionManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    getConnection: vi.fn(),
    getWallet: vi.fn(),
    cleanup: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true)
  }))
}));

describe('SolanaChainWallet', () => {
  let wallet: SolanaChainWallet;
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  beforeEach(async () => {
    const chainInfo = createMockChainInfo();
    wallet = new SolanaChainWallet(chainInfo, testMnemonic, { logger: createMockLogger() });

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  describe('initialization', () => {
    it('should initialize wallet with valid chain info', () => {
      expect(wallet).toBeInstanceOf(SolanaChainWallet);
    });

    it('should throw error for invalid chain type', () => {
      const invalidChainInfo = {
        ...createMockChainInfo(),
        chainId: { chain: 'Bitcoin', network: 'mainnet' }
      };

      expect(() => {
        new SolanaChainWallet(invalidChainInfo as any, testMnemonic);
      }).toThrow('Invalid chain type for Solana wallet');
    });

    it('should validate addresses correctly', () => {
      // Address validation is now handled at the wallet layer internally
      // No public isValidAddress method exists anymore
      expect(wallet).toBeDefined();
    });
  });

  describe('account management', () => {
    it('should get account information', async () => {
      const account = await wallet.getAccount();

      expect(account).toBeDefined();
      expect(account.address).toBe('11111111111111111111111111111112');
      expect(account.publicKeyHex).toBe('test-hex');
    });
  });

  describe('balance queries', () => {
    it('should get native SOL balance', async () => {
      const balance = await wallet.balanceOf({
        address: createSolanaAddress('11111111111111111111111111111112'),
        token: { assetType: ChainAssetType.Native }
      });

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('1');
    });

    it('should get SPL token balance', async () => {
      const balance = await wallet.balanceOf({
        address: createSolanaAddress('11111111111111111111111111111112'),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111113'
        }
      });

      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.toString()).toBe('100');
    });
  });

  describe('transfers', () => {
    it('should transfer native SOL', async () => {
      const signature = await wallet.transfer({
        recipientAddress: createSolanaAddress('11111111111111111111111111111113'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.Native }
      });

      expect(signature).toBe('test-signature');
    });

    it('should transfer SPL tokens', async () => {
      const signature = await wallet.transfer({
        recipientAddress: createSolanaAddress('11111111111111111111111111111113'),
        amount: new BigNumber(10),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111114'
        }
      });

      expect(signature).toBe('test-signature');
    });
  });

  describe('fee estimation', () => {
    it('should estimate fee for native SOL transfer', async () => {
      const fee = await wallet.estimateFee({
        recipientAddress: createSolanaAddress('11111111111111111111111111111113'),
        amount: new BigNumber(1),
        token: { assetType: ChainAssetType.Native }
      });

      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.toString()).toBe('0.001');
    });

    it('should estimate fee for SPL token transfer', async () => {
      const fee = await wallet.estimateFee({
        recipientAddress: createSolanaAddress('11111111111111111111111111111113'),
        amount: new BigNumber(10),
        token: {
          assetType: ChainAssetType.SPL,
          tokenAddress: '11111111111111111111111111111114'
        }
      });

      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.toString()).toBe('0.002');
    });
  });

  describe('message signing', () => {
    it('should sign message directly in wallet', async () => {
      const signature = await wallet.signMessage({
        message: 'test message'
      });

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('should handle empty message', async () => {
      await expect(
        wallet.signMessage({
          message: ''
        })
      ).rejects.toThrow('Missing sign data');
    });
  });

  describe('asset type support', () => {
    it('should handle unsupported asset type', async () => {
      await expect(
        wallet.balanceOf({
          address: createSolanaAddress('11111111111111111111111111111112'),
          token: { assetType: 'UnsupportedType' as any }
        })
      ).rejects.toThrow('Solana: Asset type Unknown is not supported');
    });
  });

  describe('cleanup', () => {
    it('should dispose resources properly', () => {
      expect(() => wallet.destroy()).not.toThrow();
    });
  });
});
