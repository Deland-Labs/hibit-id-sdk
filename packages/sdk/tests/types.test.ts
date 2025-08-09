import { describe, it, expect } from 'vitest';
import {
  ChainAccountInfo,
  GetBalanceRequest,
  GetAccountRequest,
  SignMessageRequest,
  TransferRequest,
  GetEstimatedFeeRequest,
  HibitIdError
} from '../src/lib/types';
import { ChainAccount, HibitIdSdkErrorCode } from '@delandlabs/coin-base';
import {
  ChainAssetType,
  ChainType,
  ChainNetwork,
  ChainId
} from '@delandlabs/hibit-basic-types';

describe('Types and Interfaces', () => {
  describe('ChainAccountInfo', () => {
    it('should have correct structure', () => {
      const mockChainAccount: ChainAccount = {
        address: '0x1234567890abcdef',
        publicKey: 'mock-public-key',
        chainId: { type: 'TON', network: 'TESTNET' }
      };

      const chainAccountInfo: ChainAccountInfo = {
        account: mockChainAccount,
        isPrimary: true,
        isActive: true
      };

      expect(chainAccountInfo.account).toBe(mockChainAccount);
      expect(chainAccountInfo.isPrimary).toBe(true);
      expect(chainAccountInfo.isActive).toBe(true);
    });

    it('should allow multiple accounts with only one primary', () => {
      const mockAccount1: ChainAccount = {
        address: '0x1111',
        publicKey: 'key1',
        chainId: { type: 'TON', network: 'TESTNET' }
      };

      const mockAccount2: ChainAccount = {
        address: '0x2222',
        publicKey: 'key2',
        chainId: { type: 'ETHEREUM', network: 'SEPOLIA' }
      };

      const accounts: ChainAccountInfo[] = [
        { account: mockAccount1, isPrimary: true, isActive: true },
        { account: mockAccount2, isPrimary: false, isActive: true }
      ];

      const primaryAccounts = accounts.filter((acc) => acc.isPrimary);
      expect(primaryAccounts).toHaveLength(1);
      expect(primaryAccounts[0].account).toBe(mockAccount1);
    });
  });

  describe('Request Types Require ChainId', () => {
    it('GetBalanceRequest should require chainId', () => {
      const request: GetBalanceRequest = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        assetType: ChainAssetType.Native
      };

      expect(request.chainId).toStrictEqual(
        new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
      );
      expect(request.assetType).toBe(ChainAssetType.Native);
    });

    it('GetAccountRequest should require chainId', () => {
      const request: GetAccountRequest = {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia)
      };

      expect(request.chainId).toStrictEqual(
        new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia)
      );
    });

    it('SignMessageRequest should require chainId', () => {
      const request: SignMessageRequest = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        message: 'Hello, World!'
      };

      expect(request.chainId).toStrictEqual(
        new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
      );
      expect(request.message).toBe('Hello, World!');
    });

    it('TransferRequest should require chainId', () => {
      const request: TransferRequest = {
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        toAddress: '0x1234567890abcdef',
        amount: '1000000000000000000',
        assetType: ChainAssetType.Native
      };

      expect(request.chainId).toStrictEqual(
        new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia)
      );
      expect(request.toAddress).toBe('0x1234567890abcdef');
      expect(request.amount).toBe('1000000000000000000');
    });

    it('GetEstimatedFeeRequest should require chainId', () => {
      const request: GetEstimatedFeeRequest = {
        chainId: new ChainId(ChainType.Ton, ChainNetwork.TonTestNet),
        toAddress: '0xrecipient',
        amount: '1000000',
        assetType: ChainAssetType.ERC20,
        contractAddress: '0xtoken'
      };

      expect(request.chainId).toStrictEqual(
        new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
      );
      expect(request.contractAddress).toBe('0xtoken');
    });
  });

  describe('HibitIdError', () => {
    it('should create error with code and message', () => {
      const error = new HibitIdError(
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        'Wallet is not connected'
      );

      expect(error.code).toBe(HibitIdSdkErrorCode.WALLET_NOT_CONNECTED);
      expect(error.message).toBe('Wallet is not connected');
      expect(error).toBeInstanceOf(Error);
    });

    it('should support all error codes', () => {
      const errorCodes = [
        HibitIdSdkErrorCode.USER_CANCEL_CONNECTION,
        HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
        HibitIdSdkErrorCode.INVALID_MNEMONIC,
        HibitIdSdkErrorCode.MNEMONIC_DERIVATION_FAILED,
        HibitIdSdkErrorCode.INVALID_DERIVATION_PATH
      ];

      errorCodes.forEach((code) => {
        const error = new HibitIdError(code, `Test error for ${code}`);
        expect(error.code).toBe(code);
        expect(error.message).toContain(code);
      });
    });
  });

  describe('Asset Types', () => {
    it('should support all asset types', () => {
      // ChainAssetType values are defined in @delandlabs/hibit-basic-types
      // We just check they exist
      expect(ChainAssetType.Native).toBeDefined();
      expect(ChainAssetType.ERC20).toBeDefined();
      // NFT may not be defined in all versions of hibit-basic-types
      if ('NFT' in ChainAssetType) {
        expect(ChainAssetType.NFT).toBeDefined();
      }
    });
  });

  describe('Chain IDs', () => {
    it('should support all chain IDs', () => {
      // ChainId toString format is determined by @delandlabs/hibit-basic-types
      // We just check they can be created and converted to string
      const ethSepoliaId = new ChainId(
        ChainType.Ethereum,
        ChainNetwork.EthereumSepolia
      );
      expect(ethSepoliaId.toString()).toBeDefined();
      expect(ethSepoliaId.toString()).toContain('60'); // Ethereum chain type

      const bscTestnetId = new ChainId(
        ChainType.Ethereum,
        ChainNetwork.EvmBscTestNet
      );
      expect(bscTestnetId.toString()).toBeDefined();

      const tonTestnetId = new ChainId(ChainType.Ton, ChainNetwork.TonTestNet);
      expect(tonTestnetId.toString()).toBeDefined();
      expect(tonTestnetId.toString()).toContain('607'); // TON chain type
    });
  });
});
