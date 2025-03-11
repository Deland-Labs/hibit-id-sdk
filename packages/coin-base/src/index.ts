import 'reflect-metadata';
import BigNumber from 'bignumber.js';
import { AssetInfo, ChainInfo, WalletAccount } from './types';
import { getEcdsaDerivedPrivateKey, getEd25519DerivedPrivateKey } from './derive';

export * from './types';
export * from './enums';
export * from './derive';

export abstract class BaseChainWallet {
  public readonly chainInfo: ChainInfo;
  protected readonly mnemonic: string;

  protected constructor(chainInfo: ChainInfo, phrase: string) {
    this.chainInfo = chainInfo;
    this.mnemonic = phrase;
  }

  protected async getEcdsaDerivedPrivateKey(derivationPath: string): Promise<string> {
    return getEcdsaDerivedPrivateKey(this.mnemonic, derivationPath);
  }

  protected async getEd25519DerivedPrivateKey(
    derivationPath: string,
    concatPub: boolean,
    encode: 'hex' | 'base58'
  ): Promise<string> {
    return getEd25519DerivedPrivateKey(this.mnemonic, derivationPath, concatPub, encode);
  }

  public abstract getAccount: () => Promise<WalletAccount>;
  public abstract signMessage: (message: string) => Promise<string>;
  public abstract balanceOf: (address: string, assetInfo: AssetInfo) => Promise<BigNumber>;
  public abstract transfer: (toAddress: string, amount: BigNumber, assetInfo: AssetInfo, payload?: string) => Promise<string>;
  public abstract getEstimatedFee: (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => Promise<BigNumber>;
}
