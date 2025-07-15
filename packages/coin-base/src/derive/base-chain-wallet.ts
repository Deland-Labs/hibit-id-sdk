import BigNumber from "bignumber.js";
import { AssetInfo, ChainInfo, WalletAccount } from "../model";
import { getEcdsaDerivedPrivateKey } from "./ecdsa";
import { getEd25519DerivedPrivateKey } from "./ed25519";
import { MnemonicError, HibitIdErrorCode } from "../errors";

export abstract class BaseChainWallet {
  public readonly chainInfo: ChainInfo;
  protected readonly mnemonic: string;

  protected constructor(chainInfo: ChainInfo, phrase: string) {
    // Add basic validation
    if (!phrase?.trim()) {
      throw new MnemonicError(
        HibitIdErrorCode.INVALID_MNEMONIC,
        `${chainInfo.name}: Mnemonic cannot be empty`
      );
    }
    
    // Pre-validate mnemonic format
    const words = phrase.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      throw new MnemonicError(
        HibitIdErrorCode.INVALID_MNEMONIC,
        `${chainInfo.name}: Invalid mnemonic length (got ${words.length} words, expected 12 or 24)`
      );
    }
    
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
