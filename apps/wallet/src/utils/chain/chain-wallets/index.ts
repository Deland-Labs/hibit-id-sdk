import { WalletAccount } from "@deland-labs/hibit-id-sdk"
import { getChainByChainId } from ".."
import { ChainId, Chain } from "../../basicTypes"
import { EthereumChainWallet } from "./ethereum"
import { TonChainWallet } from "./ton"
import { AssetInfo, ChainWallet } from "./types"
import BigNumber from "bignumber.js"

export class ChainWalletPool {
  private walletMap: Record<string, ChainWallet>
  private phrase: string

  constructor(phrase: string) {
    this.walletMap = {}
    this.phrase = phrase
  }

  get = (chainId: ChainId): ChainWallet => {
    const chainInfo = getChainByChainId(chainId)
    if (!chainInfo) {
      throw new Error(`Chain ${chainId.toString()} not found`)
    }
    const chainKey = chainId.toString()
    if (!this.walletMap[chainKey]) {
      // TODO: add more chains
      if (chainId.type.equals(Chain.Ethereum)) {
        this.walletMap[chainKey] = new EthereumChainWallet(chainInfo, this.phrase)
      } else if (chainInfo.chainId.type.equals(Chain.Ton)) {
        this.walletMap[chainKey] = new TonChainWallet(chainInfo, this.phrase)
      } else {
        throw new Error(`ChainWallet of chain ${chainKey} not supported`)
      }
    }
    return this.walletMap[chainKey]
  }

  getAccount = async (chainId: ChainId): Promise<WalletAccount> => {
    return await this.get(chainId).getAccount()
  }

  signMessage = async (message: string, chainId: ChainId): Promise<string> => {
    return await this.get(chainId).signMessage(message)
  }

  balanceOf = async (address: string, assetInfo: AssetInfo): Promise<BigNumber> => {
    const chainId = new ChainId(assetInfo.chain, assetInfo.chainNetwork)
    return await this.get(chainId).balanceOf(address, assetInfo)
  }
  
  transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<string> => {
    const chainId = new ChainId(assetInfo.chain, assetInfo.chainNetwork)
    return await this.get(chainId).transfer(toAddress, amount, assetInfo)
  }

  getEstimatedFee = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<BigNumber> => {
    const chainId = new ChainId(assetInfo.chain, assetInfo.chainNetwork)
    return await this.get(chainId).getEstimatedFee(toAddress, amount, assetInfo)
  }
}
