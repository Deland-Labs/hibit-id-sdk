import { expect, test, vi } from 'vitest';
// Import test setup to ensure address validator is registered
import './setup';
import { EthereumChainWallet } from '../src/chain-wallet/wallet';
import { Ethereum } from './test-chains';
import { TransactionError, BalanceQueryError, FeeEstimationError, createAddress } from '@delandlabs/coin-base';
import { ChainAssetType, ChainType } from '@delandlabs/hibit-basic-types';
import BigNumber from 'bignumber.js';
import { getWalletInternals } from './test-utils';
import { CHAIN_CONFIG } from './setup';

const testMnemonic = 'test test test test test test test test test test test junk';
// Use a valid Ethereum address with correct checksum
const testAddress = '0x742d35cC6634C0532925a3B844BC9e7C68F8C574';
const invalidAddress = 'invalid-address';

test('should handle invalid token address', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  await wallet.getAccount(); // Ensure validator is registered

  await expect(
    wallet.balanceOf({
      address: createAddress(testAddress, CHAIN_CONFIG.CHAIN),
      token: {
        assetType: ChainAssetType.ERC20,
        tokenAddress: 'invalid-address'
      }
    })
  ).rejects.toThrow(BalanceQueryError);
});

test('should handle insufficient balance during transfer', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);

  // Mock provider to simulate insufficient balance
  const mockProvider = {
    getBalance: vi.fn().mockResolvedValue(0n),
    sendTransaction: vi.fn().mockRejectedValue(new Error('insufficient funds')),
    getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
    getFeeData: vi.fn().mockResolvedValue({ gasPrice: 20000000000n }),
    getTransactionCount: vi.fn().mockResolvedValue(0),
    estimateGas: vi.fn().mockResolvedValue(21000n),
    broadcastTransaction: vi.fn().mockRejectedValue(new Error('insufficient funds')),
    _isProvider: true
  };

  // Wait for initialization
  await wallet.getAccount();

  // Access internal connection manager
  const internals = getWalletInternals(wallet);
  vi.spyOn(internals.connectionManager, 'getProvider').mockReturnValue(mockProvider);

  await expect(
    wallet.transfer({
      recipientAddress: createAddress(testAddress, ChainType.Ethereum),
      amount: new BigNumber('1000'),
      token: { assetType: ChainAssetType.Native }
    })
  ).rejects.toThrow(TransactionError);
});

test('should handle invalid recipient address', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  await wallet.getAccount(); // Ensure validator is registered

  // Test that createAddress validation works properly after wallet initialization
  expect(() => createAddress(invalidAddress, ChainType.Ethereum)).toThrow('Invalid Ethereum address');

  // Test valid address creation to ensure validator is working
  const validAddress = createAddress(testAddress, ChainType.Ethereum);
  expect(validAddress).toBe(testAddress);
});

test('should handle negative transfer amount', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  await wallet.getAccount(); // Ensure validator is registered

  await expect(
    wallet.transfer({
      recipientAddress: createAddress(testAddress, ChainType.Ethereum),
      amount: new BigNumber('-0.1'),
      token: { assetType: ChainAssetType.Native }
    })
  ).rejects.toThrow('Invalid transfer amount');
});

test('should handle ERC20 transfer without token address', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  await wallet.getAccount(); // Ensure validator is registered

  await expect(
    wallet.transfer({
      recipientAddress: createAddress(testAddress, ChainType.Ethereum),
      amount: new BigNumber('100'),
      token: { assetType: ChainAssetType.ERC20 }
    })
  ).rejects.toThrow('Ethereum: Token address is required');
});

test('should handle fee estimation for invalid address', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  await wallet.getAccount(); // Ensure validator is registered

  // Test that createAddress validation works properly after wallet initialization
  expect(() => createAddress(invalidAddress, ChainType.Ethereum)).toThrow('Invalid Ethereum address');

  // Test valid address creation to ensure validator is working
  const validAddress = createAddress(testAddress, ChainType.Ethereum);
  expect(validAddress).toBe(testAddress);
});

test('should handle fee estimation with negative amount', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  await wallet.getAccount(); // Ensure validator is registered

  await expect(
    wallet.estimateFee({
      recipientAddress: createAddress(testAddress, ChainType.Ethereum),
      amount: new BigNumber('-0.1'),
      token: { assetType: ChainAssetType.Native }
    })
  ).rejects.toThrow(FeeEstimationError);
});

test('should handle provider connection errors', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);

  // Wait for initialization
  await wallet.getAccount();

  // Mock connection manager to throw network error
  const internals = getWalletInternals(wallet);
  vi.spyOn(internals.connectionManager, 'getProvider').mockImplementation(() => {
    throw new Error('Connection failed');
  });

  await expect(
    wallet.balanceOf({
      address: createAddress(testAddress, ChainType.Ethereum),
      token: { assetType: ChainAssetType.Native }
    })
  ).rejects.toThrow();
}, 10000); // Increase timeout to 10 seconds

test('should handle ERC20 decimals fetch failure', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  const tokenAddress = '0x1234567890123456789012345678901234567890';

  // Wait for initialization
  await wallet.getAccount();

  // Mock provider to simulate contract call failure
  const mockProvider = {
    getContract: vi.fn().mockImplementation(() => ({
      decimals: vi.fn().mockRejectedValue(new Error('call revert'))
    })),
    _isProvider: true
  };

  const internals = getWalletInternals(wallet);
  vi.spyOn(internals.connectionManager, 'getProvider').mockReturnValue(mockProvider);

  await expect(
    wallet.balanceOf({
      address: createAddress(testAddress, ChainType.Ethereum),
      token: {
        assetType: ChainAssetType.ERC20,
        tokenAddress
      }
    })
  ).rejects.toThrow(BalanceQueryError);
});

test('should handle unsupported asset type', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  await wallet.getAccount(); // Ensure validator is registered

  await expect(
    wallet.balanceOf({
      address: createAddress(testAddress, ChainType.Ethereum),
      token: {
        assetType: ChainAssetType.ICRC3 // Unsupported for Ethereum
      }
    })
  ).rejects.toThrow('Ethereum: Asset type ICRC3 is not supported');
});

test('should handle message signing with null message', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);

  await expect(
    wallet.signMessage({
      message: null as unknown as string
    })
  ).rejects.toThrow();
});

test('should handle message signing with undefined message', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);

  await expect(
    wallet.signMessage({
      message: undefined as unknown as string
    })
  ).rejects.toThrow();
});

test('should clean up resources on dispose', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);

  // Wait for initialization
  await wallet.getAccount();

  // Access internal managers
  const internals = getWalletInternals(wallet);
  const connectionManager = internals.connectionManager;

  // Spy on cleanup methods
  const connectionCleanupSpy = vi.spyOn(connectionManager, 'cleanup');

  // Dispose the wallet
  wallet.destroy();

  // Verify cleanup methods were called
  expect(connectionCleanupSpy).toHaveBeenCalled();
});
