import { WalletAccount } from "@delandlabs/hibit-id-sdk"
import { getChainByChainId } from ".."
import { ChainId, Chain } from "../../basicTypes"
import { EthereumChainWallet } from "./ethereum"
import { TonChainWallet } from "./ton"
import { AssetInfo } from "./types"
import BigNumber from "bignumber.js"
import { DfinityChainWallet } from "./dfinity"
import { KaspaChainWallet } from "./kaspa"

// TODO: expand as supported chains grow
export type ChainWallet = EthereumChainWallet | TonChainWallet | DfinityChainWallet | KaspaChainWallet

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
      } else if (chainInfo.chainId.type.equals(Chain.Dfinity)) {
        this.walletMap[chainKey] = new DfinityChainWallet(chainInfo, this.phrase)
      } else if (chainInfo.chainId.type.equals(Chain.Kaspa)) {
        this.walletMap[chainKey] = new KaspaChainWallet(chainInfo, this.phrase)
      } else {
        throw new Error(`ChainWallet of chain ${chainKey} not supported`)
      }
    }
    return this.walletMap[chainKey]
  }

  getAccount = async (chainId: ChainId): Promise<WalletAccount> => {
    try {
      return await this.get(chainId).getAccount()
    } catch (e) {
      throw e
    }
  }

  signMessage = async (message: string, chainId: ChainId): Promise<string> => {
    try {
      return await this.get(chainId).signMessage(message)
    } catch (e) {
      throw e
    }
  }

  balanceOf = async (address: string, assetInfo: AssetInfo): Promise<BigNumber> => {
    try {
      const chainId = new ChainId(assetInfo.chain, assetInfo.chainNetwork)
      return await this.get(chainId).balanceOf(address, assetInfo)
    } catch (e) {
      throw e
    }
  }
  
  transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<string> => {
    try {
      const chainId = new ChainId(assetInfo.chain, assetInfo.chainNetwork)
      return await this.get(chainId).transfer(toAddress, amount, assetInfo)
    } catch (e) {
      throw e
    }
  }

  getEstimatedFee = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<BigNumber> => {
    try {
      const chainId = new ChainId(assetInfo.chain, assetInfo.chainNetwork)
      return await this.get(chainId).getEstimatedFee(toAddress, amount, assetInfo)
    } catch (e) {
      throw e
    }
  }
}
