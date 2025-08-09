import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import BigNumber from 'bignumber.js';
import { ChainAssetType, ChainType } from '@delandlabs/hibit-basic-types';
import { TokenIdentifier, SignMessageParams, BalanceQueryParams, TransferParams } from '../src/types/wallet';
import { createAddress } from '../src/types/branded';
import { setupTestValidators, cleanupTestValidators, TEST_ADDRESSES } from './test-validators';

describe('Wallet Types', () => {
  beforeEach(() => {
    setupTestValidators();
  });

  afterEach(() => {
    cleanupTestValidators();
  });
  describe('TokenIdentifier', () => {
    test('should create native token identifier', () => {
      const nativeToken: TokenIdentifier = {
        assetType: ChainAssetType.Native,
        tokenAddress: undefined
      };

      expect(nativeToken.assetType).toBeDefined();
      expect(nativeToken.tokenAddress).toBeUndefined();
    });

    test('should create ERC20 token identifier', () => {
      const erc20Token: TokenIdentifier = {
        assetType: ChainAssetType.ERC20,
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678'
      };

      expect(erc20Token.assetType).toBeDefined();
      expect(erc20Token.tokenAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    test('should handle optional tokenAddress', () => {
      const tokenWithoutAddress: TokenIdentifier = {
        assetType: ChainAssetType.Native
      };

      const tokenWithAddress: TokenIdentifier = {
        assetType: ChainAssetType.ERC20,
        tokenAddress: '0xtoken123'
      };

      expect(tokenWithoutAddress.tokenAddress).toBeUndefined();
      expect(tokenWithAddress.tokenAddress).toBe('0xtoken123');
    });
  });

  describe('SignMessageParams', () => {
    test('should create params with message only', () => {
      const params: SignMessageParams = {
        message: 'Hello, World!'
      };

      expect(params.message).toBe('Hello, World!');
      expect(params.deterministic).toBeUndefined();
    });

    test('should create params with deterministic flag', () => {
      const deterministicParams: SignMessageParams = {
        message: 'Sign this message',
        deterministic: true
      };

      const nonDeterministicParams: SignMessageParams = {
        message: 'Sign this message',
        deterministic: false
      };

      expect(deterministicParams.deterministic).toBe(true);
      expect(nonDeterministicParams.deterministic).toBe(false);
    });

    test('should handle empty message', () => {
      const params: SignMessageParams = {
        message: ''
      };

      expect(params.message).toBe('');
    });

    test('should handle long message', () => {
      const longMessage = 'A'.repeat(1000);
      const params: SignMessageParams = {
        message: longMessage
      };

      expect(params.message).toBe(longMessage);
      expect(params.message.length).toBe(1000);
    });

    test('should handle special characters in message', () => {
      const specialMessage = 'Hello 🌍! Special chars: @#$%^&*()_+-=[]{}|;:,.<>?';
      const params: SignMessageParams = {
        message: specialMessage
      };

      expect(params.message).toBe(specialMessage);
    });
  });

  describe('BalanceQueryParams', () => {
    test('should create balance query params', () => {
      const ethAddress = createAddress(TEST_ADDRESSES.ethereum.valid, ChainType.Ethereum);
      const params: BalanceQueryParams<typeof ChainType.Ethereum> = {
        address: ethAddress,
        token: {
          assetType: ChainAssetType.Native
        }
      };

      expect(params.address).toBe(ethAddress);
      expect(params.token.assetType).toBeDefined();
    });

    test('should handle different address formats', () => {
      const ethParams: BalanceQueryParams<typeof ChainType.Ethereum> = {
        address: createAddress(TEST_ADDRESSES.ethereum.valid, ChainType.Ethereum),
        token: { assetType: ChainAssetType.Native }
      };

      const solanaParams: BalanceQueryParams<typeof ChainType.Solana> = {
        address: createAddress(TEST_ADDRESSES.solana.valid, ChainType.Solana),
        token: { assetType: ChainAssetType.Native }
      };

      const tonParams: BalanceQueryParams<typeof ChainType.Ton> = {
        address: createAddress(TEST_ADDRESSES.ton.valid, ChainType.Ton),
        token: { assetType: ChainAssetType.Native }
      };

      expect(ethParams.address).toMatch(/^0x[0-9a-f]{40}$/i);
      expect(solanaParams.address.length).toBe(32);
      expect(tonParams.address).toContain('EQ');
    });

    test('should handle token with contract address', () => {
      const params: BalanceQueryParams<typeof ChainType.Ethereum> = {
        address: createAddress(TEST_ADDRESSES.ethereum.valid, ChainType.Ethereum),
        token: {
          assetType: ChainAssetType.ERC20,
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        }
      };

      expect(params.token.tokenAddress).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });
  });

  describe('TransferParams', () => {
    test('should create transfer params with required fields', () => {
      const recipientAddr = createAddress(TEST_ADDRESSES.ethereum.valid, ChainType.Ethereum);
      const params: TransferParams<typeof ChainType.Ethereum> = {
        recipientAddress: recipientAddr,
        amount: new BigNumber('1000000000000000000'), // 1 ETH in wei
        token: {
          assetType: ChainAssetType.Native
        }
      };

      expect(params.recipientAddress).toBe(recipientAddr);
      expect(params.amount).toBeInstanceOf(BigNumber);
      expect(params.amount.toString()).toBe('1000000000000000000');
      expect(params.token.assetType).toBeDefined();
      expect(params.payload).toBeUndefined();
    });

    test('should create transfer params with payload', () => {
      const params: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: new BigNumber('500'),
        token: {
          assetType: ChainAssetType.ERC20,
          tokenAddress: '0xtoken123'
        },
        payload: 'additional_data_for_transfer'
      };

      expect(params.payload).toBe('additional_data_for_transfer');
    });

    test('should handle different amount formats', () => {
      const paramsWithString: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: new BigNumber('123.456'),
        token: { assetType: ChainAssetType.Native }
      };

      const paramsWithNumber: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: new BigNumber(789),
        token: { assetType: ChainAssetType.Native }
      };

      const paramsWithExponential: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: new BigNumber('1e18'),
        token: { assetType: ChainAssetType.Native }
      };

      expect(paramsWithString.amount.toString()).toBe('123.456');
      expect(paramsWithNumber.amount.toString()).toBe('789');
      expect(paramsWithExponential.amount.toString()).toBe('1000000000000000000');
    });

    test('should handle zero amount', () => {
      const params: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: new BigNumber('0'),
        token: { assetType: ChainAssetType.Native }
      };

      expect(params.amount.isZero()).toBe(true);
      expect(params.amount.toString()).toBe('0');
    });

    test('should handle very large amounts', () => {
      const largeAmount = new BigNumber('999999999999999999999999999999');
      const params: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: largeAmount,
        token: { assetType: ChainAssetType.Native }
      };

      expect(params.amount.toFixed()).toBe('999999999999999999999999999999');
    });
  });

  describe('Address Validation', () => {
    test('should reject invalid addresses', () => {
      expect(() => {
        createAddress(TEST_ADDRESSES.ethereum.invalid, ChainType.Ethereum);
      }).toThrow('Invalid Ethereum address');

      expect(() => {
        createAddress(TEST_ADDRESSES.bitcoin.invalid, ChainType.Bitcoin);
      }).toThrow('Invalid Bitcoin address');
    });

    test('should accept valid addresses', () => {
      expect(() => {
        createAddress(TEST_ADDRESSES.ethereum.valid, ChainType.Ethereum);
      }).not.toThrow();

      expect(() => {
        createAddress(TEST_ADDRESSES.solana.valid, ChainType.Solana);
      }).not.toThrow();
    });
  });

  describe('Type Compatibility', () => {
    test('TokenIdentifier should be compatible across all params', () => {
      const sharedToken: TokenIdentifier = {
        assetType: ChainAssetType.ERC20,
        tokenAddress: '0xsharedtoken123'
      };

      const balanceParams: BalanceQueryParams = {
        address: createAddress(TEST_ADDRESSES.generic.user, ChainType.Tron),
        token: sharedToken
      };

      const transferParams: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: new BigNumber('100'),
        token: sharedToken
      };

      expect(balanceParams.token).toBe(sharedToken);
      expect(transferParams.token).toBe(sharedToken);
    });

    test('should maintain BigNumber type consistency', () => {
      const amount = new BigNumber('123.456789');

      const transferParams: TransferParams = {
        recipientAddress: createAddress(TEST_ADDRESSES.generic.recipient, ChainType.Tron),
        amount: amount,
        token: { assetType: ChainAssetType.Native }
      };

      expect(transferParams.amount).toBe(amount);
    });
  });
});
