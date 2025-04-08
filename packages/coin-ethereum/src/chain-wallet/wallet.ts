import BigNumber from 'bignumber.js';
import { Contract, formatEther, HDNodeWallet, isAddress, JsonRpcProvider, parseEther, parseUnits, WebSocketProvider } from 'ethers';
import { erc20Abi, getChain } from './utils';
import { AssetInfo, BaseChainWallet, ChainId, ChainInfo, WalletAccount } from '@delandlabs/coin-base';
import { CHAIN, NATIVE_ASSET, FT_ASSET, CHAIN_NAME } from './defaults';

export class EthereumChainWallet extends BaseChainWallet {
  private wallet: HDNodeWallet;
  private readonly providerMap: Record<string, JsonRpcProvider | WebSocketProvider> = {};

  constructor(chainInfo: ChainInfo, mnemonic: string) {
    if (!chainInfo.chainId.type.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid chain type`);
    }
    super(chainInfo, mnemonic);
    this.wallet = HDNodeWallet.fromPhrase(this.mnemonic);
    this.wallet = this.wallet.connect(this.getProvider(this.chainInfo));
    setInterval(() => {
      Object.values(this.providerMap).forEach(provider => {
        if (provider instanceof WebSocketProvider) {
          provider.getBlockNumber();
        }
      });
    }, 30000); // Ping ws providers every 30 seconds
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    return {
      address: this.wallet.address
    };
  };

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    return await this.wallet.signMessage(message);
  };

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!isAddress(address)) {
      throw new Error(`${CHAIN_NAME}: invalid wallet address`);
    }
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }

    const chainInfo = getChain(new ChainId(assetInfo.chain, assetInfo.chainNetwork));
    if (!chainInfo) {
      throw new Error(
        `${CHAIN_NAME}: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`
      );
    }
    const provider = this.getProvider(chainInfo);
    
    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      try {
        const balance = await provider.getBalance(address);
        return new BigNumber(balance.toString()).shiftedBy(-assetInfo.decimalPlaces.value);
      } catch (e) {
        console.error(e);
        throw new Error(`${CHAIN_NAME}: failed to get native balance`);
      }
    }
    // erc20
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      const contract = new Contract(assetInfo.contractAddress, erc20Abi, provider);
      const getDecimals = contract.decimals();
      const getBalance = contract.balanceOf(address);
      try {
        const [decimals, balance] = await Promise.all([getDecimals, getBalance]);
        return new BigNumber(balance.toString()).shiftedBy(-Number(decimals));
      } catch (e) {
        console.error(e);
        throw new Error(`${CHAIN_NAME}: failed to get balance`);
      }
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!isAddress(toAddress)) {
      throw new Error(`${CHAIN_NAME}: invalid wallet address`);
    }
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    try {
      // native
      if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
        const tx = await this.wallet.sendTransaction({
          to: toAddress,
          value: parseEther(amount.toString())
        });
        return tx.hash;
      }
      // erc20
      if (assetInfo.chainAssetType.equals(FT_ASSET)) {
        const chainInfo = getChain(new ChainId(assetInfo.chain, assetInfo.chainNetwork));
        if (!chainInfo) {
          throw new Error(
            `${CHAIN_NAME}: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`
          );
        }
        const provider = this.getProvider(chainInfo);
        const token = new Contract(assetInfo.contractAddress, erc20Abi, this.wallet.connect(provider));
        const decimals = await token.decimals();
        const tx = await token.getFunction('transfer')(toAddress, parseUnits(amount.toString(), decimals));
        return tx.hash;
      }
    } catch (e) {
      console.error(e);
      if ((e as any).code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient gas balance');
      }
      throw e;
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override getEstimatedFee = async (
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<BigNumber> => {
    if (!isAddress(toAddress)) {
      throw new Error(`${CHAIN_NAME}: invalid wallet address`);
    }
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const feeData = await this.wallet.provider!.getFeeData();
      const price = new BigNumber(feeData.gasPrice!.toString());
      const req = {
        to: toAddress,
        value: parseEther(amount.toString())
      };
      const estimatedGas = await this.wallet.estimateGas(req);
      return new BigNumber(estimatedGas.toString()).times(price).shiftedBy(-assetInfo.decimalPlaces.value);
    }
    // erc20
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      const chainInfo = getChain(new ChainId(assetInfo.chain, assetInfo.chainNetwork));
      if (!chainInfo) {
        throw new Error(
          `${CHAIN_NAME}: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`
        );
      }
      const provider = this.getProvider(chainInfo);
      const feeData = await provider!.getFeeData();
      const price = new BigNumber(feeData.gasPrice!.toString());
      const token = new Contract(assetInfo.contractAddress, erc20Abi, this.wallet.connect(provider));
      const decimals = await token.decimals();
      const estimatedGas = await token
        .getFunction('transfer')
        .estimateGas(toAddress, parseUnits(amount.toString(), decimals));
      return new BigNumber(formatEther(new BigNumber(estimatedGas.toString()).times(price).toString()));
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  private getProvider = (chainInfo: ChainInfo) => {
    let provider = this.providerMap[chainInfo.chainId.toString()]
    if (provider) {
      return provider;
    }
    if (chainInfo.wsRpcUrls?.length) {
      const wsProvider = new WebSocketProvider(chainInfo.wsRpcUrls[0], chainInfo.chainId.network.value.toNumber());

      // TODO: reconnect(https://github.com/ethers-io/ethers.js/issues/1053#issuecomment-2402226658)
      // wsProvider.websocket.onopen = () => {
      //   console.debug("[EVM WS] RPC provider websocket connected");
      // };
  
      // // Reconnect on error or close
      // wsProvider.websocket.onmessage = ((event: any) => {
      //   console.error("[EVM WS] RPC message:", event);
      //   // this.providerMap[chainInfo.chainId.toString()] = this.getProvider(chainInfo);
      // });
  
      // wsProvider.websocket.onerror = ((error: any) => {
      //   console.error("[EVM WS] RPC provider websocket error:", error);
      //   // this.providerMap[chainInfo.chainId.toString()] = this.getProvider(chainInfo);
      // });
      
      provider = wsProvider;
    } else {
      provider = new JsonRpcProvider(chainInfo.rpcUrls[0], chainInfo.chainId.network.value.toNumber());
    }
    this.providerMap[chainInfo.chainId.toString()] = provider;
    return provider;
  };
}
