import BigNumber from "bignumber.js";
import { AssetInfo, BaseChainWallet } from "../types";
import { isAddress, JsonRpcProvider, Contract, HDNodeWallet, parseEther, parseUnits, formatEther } from "ethers";
import { Chain, ChainAssetType, ChainId, ChainInfo } from "../../../basicTypes";
import { erc20Abi } from "./erc20";
import { WalletAccount } from "@deland-labs/hibit-id-sdk";
import { getChainByChainId } from "../..";

export class EthereumChainWallet extends BaseChainWallet {
  private provider: JsonRpcProvider
  private wallet: HDNodeWallet

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(Chain.Ethereum)) {
      throw new Error('Ethereum: invalid chain type');
    }
    super(chainInfo, phrase)
    this.provider = new JsonRpcProvider(
      this.chainInfo.rpcUrls[0],
      this.chainInfo.chainId.network.value.toNumber()
    )
    this.wallet = HDNodeWallet.fromPhrase(this.phrase)
    this.wallet = this.wallet.connect(this.provider)
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    return {
      address: this.wallet.address
    }
  }

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    const signature = await this.wallet.signMessage(message)
    return signature
  }

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!isAddress(address)) {
      throw new Error('Ethereum: invalid wallet address');
    }
    if (!assetInfo.chain.equals(Chain.Ethereum)) {
      throw new Error('Ethereum: invalid asset chain');
    }
    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const balance = await this.provider.getBalance(address);
      return new BigNumber(balance.toString()).shiftedBy(-assetInfo.decimalPlaces.value)
    }
    // erc20
    if (assetInfo.chainAssetType.equals(ChainAssetType.ERC20)) {
      const chainInfo = getChainByChainId(new ChainId(assetInfo.chain, assetInfo.chainNetwork))
      if (!chainInfo) {
        throw new Error(`Ethereum: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`)
      }
      const provider = new JsonRpcProvider(chainInfo.rpcUrls[0], chainInfo.chainId.network.value.toNumber());
      const contract = new Contract(assetInfo.contractAddress, erc20Abi, provider);
      const getDecimals = contract.decimals();
      const getBalance = contract.balanceOf(address);
      const [decimals, balance] = await Promise.all([getDecimals, getBalance]);
      return new BigNumber(balance.toString()).shiftedBy(-Number(decimals));
    }

    throw new Error(`Ethereum: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!isAddress(toAddress)) {
      throw new Error('Ethereum: invalid wallet address');
    }
    if (!assetInfo.chain.equals(Chain.Ethereum)) {
      throw new Error('Ethereum: invalid asset chain');
    }
    try {
      // native
      if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
        const tx = await this.wallet.sendTransaction({
          to: toAddress,
          value: parseEther(amount.toString())
        });
        return tx.hash;
      }
      // erc20
      if (assetInfo.chainAssetType.equals(ChainAssetType.ERC20)) {
        const chainInfo = getChainByChainId(new ChainId(assetInfo.chain, assetInfo.chainNetwork))
        if (!chainInfo) {
          throw new Error(`Ethereum: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`)
        }
        const provider = new JsonRpcProvider(chainInfo.rpcUrls[0], chainInfo.chainId.network.value.toNumber());
        const token = new Contract(assetInfo.contractAddress, erc20Abi, this.wallet.connect(provider));
        const decimals = await token.decimals();
        const tx = await token
          .getFunction('transfer')(toAddress, parseUnits(amount.toString(), decimals));
        return tx.hash;
      }
    } catch (e) {
      console.error(e)
      if ((e as any).code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient gas balance');
      }
      throw e;
    }

    throw new Error(`Ethereum: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  public override getEstimatedFee = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<BigNumber> => {
    if (!isAddress(toAddress)) {
      throw new Error('Ethereum: invalid wallet address');
    }
    if (!assetInfo.chain.equals(Chain.Ethereum)) {
      throw new Error('Ethereum: invalid asset chain');
    }
    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const feeData = await this.wallet.provider!.getFeeData()
      const price = new BigNumber(feeData.gasPrice!.toString())
      const req = {
        to: toAddress,
        value: parseEther(amount.toString())
      }
      const estimatedGas = await this.wallet.estimateGas(req)
      return new BigNumber(estimatedGas.toString()).times(price).shiftedBy(-assetInfo.decimalPlaces.value)
    }
    // erc20
    if (assetInfo.chainAssetType.equals(ChainAssetType.ERC20)) {
      const chainInfo = getChainByChainId(new ChainId(assetInfo.chain, assetInfo.chainNetwork))
      if (!chainInfo) {
        throw new Error(`Ethereum: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`)
      }
      const provider = new JsonRpcProvider(chainInfo.rpcUrls[0], chainInfo.chainId.network.value.toNumber());
      const feeData = await provider!.getFeeData()
      const price = new BigNumber(feeData.gasPrice!.toString())
      const token = new Contract(assetInfo.contractAddress, erc20Abi, this.wallet.connect(provider));
      const decimals = await token.decimals();
      const estimatedGas = await token
        .getFunction('transfer')
        .estimateGas(toAddress, parseUnits(amount.toString(), decimals));
      return new BigNumber(formatEther(new BigNumber(estimatedGas.toString()).times(price).toString()))
    }

    throw new Error(`Ethereum: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }
}
