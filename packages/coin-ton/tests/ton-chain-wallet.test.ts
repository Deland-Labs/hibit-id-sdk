import 'reflect-metadata';
import { describe, expect, test, beforeEach } from 'vitest';
import BigNumber from 'bignumber.js';
import { TonChainWallet } from '../src/chain-wallet/wallet';
import { TonMainNet as Ton, TonTestnet } from './test-chains';
import { ChainAssetType, ChainType } from '@delandlabs/hibit-basic-types';
import { BalanceQueryParams, TransferParams, createAddress } from '@delandlabs/coin-base';

// Import setup to use professional mocks
import './setup';

// Force mock TonClient directly
import { vi } from 'vitest';
vi.mock('@ton/ton', async () => {
  const mockClient = {
    getBalance: vi.fn().mockResolvedValue(BigInt('1000000000')),
    open: vi.fn().mockImplementation((contract: any) => ({
      ...contract,
      getSeqno: vi.fn().mockResolvedValue(1),
      send: vi.fn().mockResolvedValue(undefined),
      getBalance: vi.fn().mockResolvedValue(BigInt('500000000'))
    })),
    estimateExternalMessageFee: vi.fn().mockResolvedValue({
      source_fees: { fwd_fee: BigInt(1000), in_fwd_fee: BigInt(500), storage_fee: BigInt(200), gas_fee: BigInt(10000) }
    })
  };

  return {
    TonClient: vi.fn().mockImplementation(() => mockClient),
    Address: {
      parse: vi.fn().mockImplementation((addr: string) => ({ 
        toString: () => addr,
        toRawString: () => '0:' + addr.replace(/[^a-fA-F0-9]/g, '').padEnd(64, '0').slice(0, 64)
      })),
      isFriendly: vi.fn().mockReturnValue(true),
      parseFriendly: vi.fn().mockReturnValue({ isBounceable: true })
    },
    WalletContractV4: {
      create: vi.fn().mockImplementation(() => ({
        address: { 
          toString: () => 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
          toRawString: () => '0:f850fabfe3d10e27b240a9228c54d1b520f2b9c508aab8f4bffcd7266a9a0e9e'
        },
        init: { code: null, data: null },
        createTransfer: vi.fn().mockReturnValue({ hash: () => new Uint8Array([1, 2, 3, 4]) })
      }))
    },
    JettonMaster: {
      create: vi.fn().mockImplementation(() => ({
        getJettonData: vi.fn().mockResolvedValue({ content: { decimals: 9 } }),
        getWalletAddress: vi.fn().mockResolvedValue({ toString: () => 'EQJettonWallet123' })
      }))
    },
    JettonWallet: {
      create: vi.fn().mockImplementation(() => ({
        getBalance: vi.fn().mockResolvedValue(BigInt('500000000'))
      }))
    },
    toNano: vi.fn().mockImplementation((amount: string | number) => {
      const value = typeof amount === 'string' ? parseFloat(amount) : amount;
      return BigInt(Math.floor(value * 1000000000));
    }),
    fromNano: vi.fn().mockImplementation((amount: bigint | string) => {
      const value = typeof amount === 'string' ? BigInt(amount) : amount;
      return (Number(value) / 1000000000).toString();
    }),
    beginCell: vi.fn().mockImplementation(() => ({
      storeUint: vi.fn().mockReturnThis(),
      storeWritable: vi.fn().mockReturnThis(),
      endCell: vi.fn().mockReturnValue({ toBoc: vi.fn().mockReturnValue(Buffer.from('mock')) })
    })),
    internal: vi.fn().mockImplementation(() => ({ body: '', value: 0n, to: null, bounce: false })),
    SendMode: { PAY_GAS_SEPARATELY: 1, IGNORE_ERRORS: 2 }
  };
});

describe('TonChainWallet - Core Functionality', () => {
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  describe('Wallet Creation', () => {
    test('should create wallet with mainnet configuration', async () => {
      const wallet = new TonChainWallet(Ton, testMnemonic);
      const account = await wallet.getAccount();

      expect(account.chainId.chain).toBe(ChainType.Ton);
      expect(account.address).toBeTruthy();
    });

    test('should create wallet with testnet configuration', async () => {
      const wallet = new TonChainWallet(TonTestnet, testMnemonic);
      const account = await wallet.getAccount();

      expect(account.chainId.chain).toBe(ChainType.Ton);
      expect(account.address).toBeTruthy();
    });
  });

  describe('Balance Operations', () => {
    let wallet: TonChainWallet;

    beforeEach(() => {
      wallet = new TonChainWallet(Ton, testMnemonic);
    });

    test('should get native TON balance', async () => {
      const params: BalanceQueryParams = {
        address: createAddress('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t', ChainType.Ton),
        token: { assetType: ChainAssetType.Native }
      };

      const balance = await wallet.balanceOf(params);
      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.isPositive()).toBe(true);
    });

    test('should get jetton balance', async () => {
      const params: BalanceQueryParams = {
        address: createAddress('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t', ChainType.Ton),
        token: {
          assetType: ChainAssetType.Jetton,
          tokenAddress: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'
        }
      };

      const balance = await wallet.balanceOf(params);
      expect(balance).toBeInstanceOf(BigNumber);
      expect(balance.isPositive()).toBe(true);
    });
  });

  describe('Transfer Operations', () => {
    let wallet: TonChainWallet;

    beforeEach(() => {
      wallet = new TonChainWallet(Ton, testMnemonic);
    });

    test('should transfer native TON', async () => {
      const params: TransferParams = {
        recipientAddress: createAddress('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t', ChainType.Ton),
        amount: new BigNumber(0.1),
        token: { assetType: ChainAssetType.Native }
      };

      const txHash = await wallet.transfer(params);
      expect(typeof txHash).toBe('string');
      expect(txHash).toBeTruthy();
    });

    test('should estimate fee for native transfer', async () => {
      const params: TransferParams = {
        recipientAddress: createAddress('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t', ChainType.Ton),
        amount: new BigNumber(0.1),
        token: { assetType: ChainAssetType.Native }
      };

      const fee = await wallet.estimateFee(params);
      expect(fee).toBeInstanceOf(BigNumber);
      expect(fee.isPositive()).toBe(true);
    });
  });

  describe('Message Signing', () => {
    let wallet: TonChainWallet;

    beforeEach(() => {
      wallet = new TonChainWallet(Ton, testMnemonic);
    });

    test('should sign message', async () => {
      const signature = await wallet.signMessage({ message: 'test message' });
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64); // Ed25519 signature length
    });
  });

});
