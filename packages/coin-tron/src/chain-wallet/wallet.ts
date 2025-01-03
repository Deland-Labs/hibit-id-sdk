import { getChain } from './utils';
import { AssetInfo, BaseChainWallet, ChainId, ChainInfo, WalletAccount } from '@delandlabs/coin-base';
import { TronWeb } from 'tronweb';
import BigNumber from 'bignumber.js';
import { ADDRESS_PREFIX_BYTE, NATIVE_ASSET, FT_ASSET, CHAIN, CHAIN_NAME, DERIVING_PATH } from './defaults';
import { base } from '@delandlabs/crypto-lib';
import * as secp256k1 from '@noble/secp256k1';

class TronChainWallet extends BaseChainWallet {
  private readonly tronWeb: TronWeb;

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid chain type`);
    }
    super(chainInfo, phrase);
    this.tronWeb = new TronWeb(this.chainInfo.rpcUrls[0], this.chainInfo.rpcUrls[0]);
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    const address = await this.getAddress();
    const publicKey = await this.getPubKey(true);
    return {
      address,
      publicKey: base.toHex(publicKey)
    };
  };

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    if (!message || typeof message !== 'string') {
      throw new Error(`${CHAIN_NAME}: Invalid message format`);
    }
    try {
      return this.tronWeb.trx.signMessageV2(message);
    } catch (error: any) {
      throw new Error(`${CHAIN_NAME}: Message signing failed: ${error.message}`);
    }
  };

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!this.tronWeb.isAddress(address)) {
      throw new Error(`${CHAIN_NAME}: invalid wallet address`);
    }
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const balance = await this.tronWeb.trx.getBalance(address);
      return this.tronWeb.fromSun(balance) as BigNumber;
    }
    // trc20
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      const chainInfo = getChain(new ChainId(assetInfo.chain, assetInfo.chainNetwork));
      if (!chainInfo) {
        throw new Error(
          `${CHAIN_NAME}: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`
        );
      }
      const trc20 = await this.tronWeb.contract().at(assetInfo.contractAddress);
      const getDecimals = await trc20.decimals().call();
      const getBalance = await trc20.balanceOf(address).call();
      const [decimals, balance] = await Promise.all([getDecimals, getBalance]);
      if (typeof decimals !== 'number' || decimals < 0 || decimals > 77) {
        throw new Error(`${CHAIN_NAME}: Invalid token decimals`);
      }
      return this.tronWeb.toBigNumber(balance).shiftedBy(-decimals);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!amount || amount.isNaN() || amount.isZero() || amount.isNegative()) {
      throw new Error(`${CHAIN_NAME}: invalid transfer amount`);
    }
    if (!this.tronWeb.isAddress(toAddress)) {
      throw new Error(`${CHAIN_NAME}: invalid wallet address`);
    }
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    try {
      // native
      if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
        const realAmount = amount.shiftedBy(assetInfo.decimalPlaces.value).toNumber();
        const tx = await this.tronWeb.trx.send(toAddress, realAmount);
        return tx.transaction.txID;
      }
      // trc20
      if (assetInfo.chainAssetType.equals(FT_ASSET)) {
        const trc20 = await this.tronWeb.contract().at(assetInfo.contractAddress);
        const realAmount = amount.shiftedBy(assetInfo.decimalPlaces.value);
        const tx = await trc20.transfer(toAddress, realAmount).send();
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
    if (!this.tronWeb.isAddress(toAddress)) {
      throw new Error(`${CHAIN_NAME}: invalid wallet address`);
    }
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    const from = await this.getAddress();
    const privateKey = await this.getEcdsaDerivedPrivateKey(DERIVING_PATH);
    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const tx = await this.tronWeb.transactionBuilder.sendTrx(toAddress, amount.toNumber(), from);
      // sign tx, because we need to estimate the bandwidth
      const signedTx = await this.tronWeb.trx.sign(tx, privateKey);
      const bandwidthPrice = (await this.getBandwidthPrice())!;
      const account = await this.tronWeb.trx.getAccount(from);
      const freeNetUsage = account.free_net_usage;
      const netUsage = account.net_usage;
      const remainingFreeBandwidth = Math.max(0, freeNetUsage - netUsage);
      const bandwidthCost = signedTx.raw_data_hex.length / 2;
      let estimatedBandwith = 0;

      if (bandwidthCost > freeNetUsage) {
        estimatedBandwith = Math.max(0, bandwidthCost - remainingFreeBandwidth);
      }

      return new BigNumber(estimatedBandwith).times(bandwidthPrice);
    }

    // trc20
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      const chainInfo = getChain(new ChainId(assetInfo.chain, assetInfo.chainNetwork));
      if (!chainInfo) {
        throw new Error(
          `${CHAIN_NAME}: unsupported asset chain ${assetInfo.chain.toString()}_${assetInfo.chainNetwork.toString()}`
        );
      }
      const parameter = [
        {
          type: 'address',
          value: this.getHexAddress()
        },
        {
          type: 'uint256',
          value: 100
        }
      ];
      const energyEstimate = await this.tronWeb.transactionBuilder.estimateEnergy(
        assetInfo.contractAddress,
        'transfer(address,uint256)',
        {},
        parameter,
        from
      );
      const chainParams = await this.tronWeb.trx.getChainParameters();
      const energyFeeParam = chainParams.find((item) => item.key === 'getEnergyFee');
      if (!energyFeeParam || energyFeeParam.value <= 0) {
        throw new Error(`${CHAIN_NAME}: Invalid energy fee parameter`);
      }
      const energyFee = energyFeeParam.value;
      const feeLimit = this.tronWeb.fromSun(energyEstimate.energy_required * energyFee);
      return feeLimit as BigNumber;
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  private async getPubKey(compressed: boolean) {
    const priKeyBytes = base.fromHex(await this.getEcdsaDerivedPrivateKey(DERIVING_PATH));
    return secp256k1.getPublicKey(priKeyBytes, compressed);
  }

  private async getAddress() {
    const addressBytes = base.fromHex(await this.getHexAddress());
    return base.toBase58Check(addressBytes);
  }

  private async getHexAddress() {
    let pubKey = await this.getPubKey(false);
    if (pubKey.length === 65) {
      pubKey = pubKey.slice(1);
    }
    // hash takes last 20 bits
    const hash = base.keccak256(pubKey);
    const addressBytes = [];
    addressBytes.push(ADDRESS_PREFIX_BYTE);
    addressBytes.push(...hash.slice(12));
    return base.toHex(addressBytes);
  }

  async getBandwidthPrice() {
    const chainParameters = await this.tronWeb.trx.getChainParameters();
    const bandwidthPriceParam = chainParameters.find((param) => param.key === 'getBandwidthPrice');
    if (!bandwidthPriceParam) {
      throw new Error(`${CHAIN_NAME}: bandwidth price parameter not found`);
    }
    if (bandwidthPriceParam.value === 0) {
      throw new Error(`${CHAIN_NAME}: invalid bandwidth price`);
    }
    return bandwidthPriceParam.value / 1_000_000;
  }
}

export { TronChainWallet };
