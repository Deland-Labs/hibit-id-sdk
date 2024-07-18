import BigNumber from "bignumber.js";
import { RootAssetInfo } from "../../../apis/models";
import { ChainInfo } from "../../basicTypes";

export type AssetInfo = Pick<
  RootAssetInfo,
  'chainAssetType' | 'chain' | 'chainNetwork' | 'contractAddress' | 'decimalPlaces'
>;

export abstract class ChainWallet {
  public readonly chainInfo: ChainInfo
  protected readonly phrase: string

  constructor(chainInfo: ChainInfo, phrase: string) {
    this.chainInfo = chainInfo
    this.phrase = phrase
  }

  public abstract getAddress: () => Promise<string>
  public abstract signMessage: (message: string) => Promise<string>
  public abstract balanceOf: (address: string, assetInfo: AssetInfo) => Promise<BigNumber>
  public abstract transfer: (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => Promise<string>
}
