import BigNumber from "bignumber.js";
import { AssetInfo, BaseChainWallet } from "../types";
import { Chain, ChainAssetType, ChainId, ChainInfo } from "../../../basicTypes";
import { WalletAccount } from "@delandlabs/hibit-id-sdk";
import { KaspaRpc } from '@delandlabs/coin-kaspa-rpc'
import { getChainByChainId } from "../..";

export class KaspaChainWallet extends BaseChainWallet {
  private rpcClient: KaspaRpc

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid chain type');
    }
    super(chainInfo, phrase)
    this.rpcClient = new KaspaRpc(chainInfo.isMainnet ? 'mainnet' : 'testnet-10')
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    // TODO:
    return {
      address: ''
    }
  }

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    // TODO:
    return ''
  }

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid asset chain');
    }
    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const balance = await this.rpcClient.getBalance(address);
      return new BigNumber(balance).shiftedBy(-assetInfo.decimalPlaces.value)
    }
    // krc20
    if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
      const chainInfo = getChainByChainId(new ChainId(assetInfo.chain, assetInfo.chainNetwork))
      if (!chainInfo) {
        throw new Error(`Kaspa: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`)
      }
      const balanceInfo = await this.rpcClient.getKrc20Balance(address, assetInfo.contractAddress)
      return balanceInfo
        ? new BigNumber(balanceInfo.balance).shiftedBy(-Number(balanceInfo.dec))
        : new BigNumber(0)
    }

    throw new Error(`Kaspa: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid asset chain');
    }
    try {
      // native
      if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
        // TODO:
        return ''
      }
      // krc20
      if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
        // TODO:
        return ''
      }
    } catch (e) {
      console.error(e)
      // TODO: handle error
      throw e;
    }

    throw new Error(`Kaspa: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  public override getEstimatedFee = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<BigNumber> => {
    if (!assetInfo.chain.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid asset chain');
    }
    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      // TODO:
      return new BigNumber(0)
    }
    // krc20
    if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
      // TODO:
      return new BigNumber(0)
    }

    throw new Error(`Kaspa: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }
}
