import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { describe, it, expect } from 'vitest';
import { KaspaChainWallet } from '../src/chain-wallet/wallet';
import BigNumber from 'bignumber.js';
import { KaspaTestnet } from 'src/chain-wallet';
import { AssetInfo, DecimalPlaces, Chain, ChainNetwork, ChainAssetType } from '@delandlabs/coin-base';

describe('KaspaChainWallet', () => {
  it('should estimate fee correctly', async () => {
    const phrase = 'winter reveal extend tip vendor tiny priority afraid concert jacket fashion duty';
    let wallet = new KaspaChainWallet(KaspaTestnet, phrase);
    const toAddress = 'kaspatest:qq5zy4rfsrzllchkd7myamqqe83k55qykmpc8exyt5a4qn798f3hjx24kkevw';
    const amount = new BigNumber(2);
    const assetInfo: AssetInfo = {
      chain: new Chain(new BigNumber(111111)),
      chainNetwork: new ChainNetwork(new BigNumber(1)),
      chainAssetType: new ChainAssetType(new BigNumber(11)),
      contractAddress: 'kast',
      decimalPlaces: new DecimalPlaces(8)
    };

    const fee = await wallet.getEstimatedFee(toAddress, amount, assetInfo);

    expect(fee).toBeInstanceOf(BigNumber);
    expect(fee.isGreaterThan(0)).toBe(true);
  });
}, 10000000);
