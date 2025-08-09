import 'reflect-metadata';
import { expect, test, vitest } from 'vitest';
import { EthereumChainWallet } from '../src/chain-wallet/wallet';
import { ChainId, ChainNetwork, ChainType } from '@delandlabs/hibit-basic-types';
import { Ethereum } from './test-chains';

// set timeout to 60 seconds
vitest.setConfig({
  testTimeout: 60000
});

const testMnemonic = 'test test test test test test test test test test test junk';

test('EthereumChainWallet invalid chain type should throw', async () => {
  const invalidChainId = new ChainId(ChainType.Bitcoin, ChainNetwork.EthereumMainNet);
  const invalidChainInfo = {
    ...Ethereum,
    chainId: invalidChainId
  };

  expect(() => new EthereumChainWallet(invalidChainInfo, testMnemonic)).toThrow('Ethereum: Invalid chain type');
});

test('EthereumChainWallet signMessage', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);
  const signature = await wallet.signMessage({ message: 'Hello World' });

  expect(signature).toBeDefined();
  expect(signature).toBeInstanceOf(Uint8Array);
  expect(signature.length).toBeGreaterThan(0);
});

test('EthereumChainWallet signMessage empty message should not throw', async () => {
  const wallet = new EthereumChainWallet(Ethereum, testMnemonic);

  // Empty message is valid in Ethereum - it still produces a signature
  const signature = await wallet.signMessage({ message: '' });

  expect(signature).toBeDefined();
  expect(signature).toBeInstanceOf(Uint8Array);
  expect(signature.length).toBeGreaterThan(0);
});
