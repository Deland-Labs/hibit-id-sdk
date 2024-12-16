import 'reflect-metadata';
import BigNumber from "bignumber.js";
import { WalletAccount } from "@delandlabs/hibit-id-sdk";
import { AssetInfo, ChainInfo } from "./types";

export * from "./types"
export * from "./enums"

export abstract class BaseChainWallet {
  public readonly chainInfo: ChainInfo
  protected readonly phrase: string

  constructor(chainInfo: ChainInfo, phrase: string) {
    this.chainInfo = chainInfo
    this.phrase = phrase
  }

  public abstract getAccount: () => Promise<WalletAccount>
  public abstract signMessage: (message: string) => Promise<string>
  public abstract balanceOf: (address: string, assetInfo: AssetInfo) => Promise<BigNumber>
  public abstract transfer: (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => Promise<string>
  public abstract getEstimatedFee: (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => Promise<BigNumber>
}
