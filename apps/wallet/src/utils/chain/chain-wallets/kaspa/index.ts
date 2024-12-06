import BigNumber from "bignumber.js";
import { AssetInfo, BaseChainWallet } from "../types";
import { Chain, ChainAssetType, ChainId, ChainInfo } from "../../../basicTypes";
import { WalletAccount } from "@delandlabs/hibit-id-sdk";
import { GeneratorSettings, KaspaNetwork, KaspaRpc, Keypair, PaymentOutput, ScriptBuilder, OpCodes, Address, NetworkId, extractScriptPubKeyAddress, AddressPrefix, kaspaToSompi, signWithMultipleV2, Fees } from '@delandlabs/coin-kaspa-rpc'
import { getChainByChainId } from "../..";
import { HDNodeWallet } from "ethers";
import { createTransactions, kaspaNetworkToNetworkId, rpcUtxosToUtxoEntries, signedTransactionToSubmitTransactionMessage } from "./utils";

const DERIVING_PATH = "m/44'/111111'/0'/0/0"
const AMOUNT_FOR_INSCRIBE = kaspaToSompi("0.3");

export class KaspaChainWallet extends BaseChainWallet {
  private network: KaspaNetwork
  private networkId: NetworkId
  private rpcClient: KaspaRpc
  private keyPair: Keypair

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid chain type');
    }
    super(chainInfo, phrase)
    this.network = chainInfo.isMainnet ? 'mainnet' : 'testnet-10'
    this.networkId = kaspaNetworkToNetworkId(this.network)
    this.rpcClient = new KaspaRpc(this.network)
    const hdWallet = HDNodeWallet.fromPhrase(phrase, undefined, DERIVING_PATH)
    const privKey = hdWallet.privateKey
    this.keyPair = Keypair.fromPrivateKeyHex(privKey.slice(2))
    console.debug(privKey, this.keyPair)
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    return {
      address: this.keyPair
        .toAddress(this.networkId.networkType)
        .toString(),
      publicKey: this.keyPair.publicKey,
    }
  }

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    const signature = this.keyPair.signMessageWithAuxData(Buffer.from(message), new Uint8Array(32).fill(0))
    return Buffer.from(signature).toString('hex')
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

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<string> => {
    if (!assetInfo.chain.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid asset chain');
    }
    const fee = await this.getEstimatedFee(toAddress, amount, assetInfo)
    const utxos = await this.rpcClient.getUtxosByAddress(this.keyPair.toAddress(this.networkId.networkType).toString())
    const utxoEntries = rpcUtxosToUtxoEntries(utxos)

    try {
      // native
      if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
        const { transactions, summary } = await this.createTransactionsByOutputs(
          [{
            address: Address.fromString(toAddress),
            amount: BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
          }],
          this.keyPair.toAddress(this.networkId.networkType).toString(),
          new Fees(kaspaToSompi(fee.toString()))
        )
        for (const tx of transactions) {
          const signedTx = signWithMultipleV2(tx, [this.keyPair.privateKey!])
          const reqMessage = signedTransactionToSubmitTransactionMessage(signedTx, utxoEntries)
          await this.rpcClient.submitTransaction(reqMessage)
        }
        return summary.finalTransactionId.toString()
      }
      // krc20
      if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
        const scriptAddress = this.buildKrc20TransferScriptAddress(
          toAddress,
          amount.shiftedBy(assetInfo.decimalPlaces.value).toString(),
          assetInfo.contractAddress
        )
        const { transactions, summary } = await this.createTransactionsByOutputs(
          [{
            address: Address.fromString(scriptAddress),
            amount: AMOUNT_FOR_INSCRIBE,
          }],
          this.keyPair.toAddress(this.networkId.networkType).toString(),
          new Fees(kaspaToSompi(fee.toString()))
        )
        for (const tx of transactions) {
          const signedTx = signWithMultipleV2(tx, [this.keyPair.privateKey!])
          const reqMessage = signedTransactionToSubmitTransactionMessage(signedTx, utxoEntries)
          await this.rpcClient.submitTransaction(reqMessage)
        }
        return summary.finalTransactionId.toString()
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
    const feeSetting = await this.rpcClient.getFeeEstimate()
    if (!feeSetting?.priorityBucket?.feerate) {
      return new BigNumber(0)
    }
    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const { transactions, summary } = await this.createTransactionsByOutputs(
        [{
          address: Address.fromString(toAddress),
          amount: BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
        }],
        this.keyPair.toAddress(this.networkId.networkType).toString(),
        new Fees(0n)
      )
      const mass = transactions[transactions.length - 1].tx.mass
      const sompiFee = mass * BigInt(feeSetting.priorityBucket.feerate)
      console.log('fee compare', sompiFee, summary.aggregatedFees.toString())
      return new BigNumber(sompiFee.toString()).shiftedBy(-assetInfo.decimalPlaces.value)
    }
    // krc20
    if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
      const scriptAddress = this.buildKrc20TransferScriptAddress(toAddress, amount.shiftedBy(assetInfo.decimalPlaces.value).toString(), assetInfo.contractAddress)
      const { transactions } = await this.createTransactionsByOutputs(
        [{
          address: Address.fromString(scriptAddress),
          amount: AMOUNT_FOR_INSCRIBE,
        }],
        this.keyPair.toAddress(this.networkId.networkType).toString(),
        new Fees(0n)
      )
      const mass = transactions[transactions.length - 1].tx.mass
      const sompiFee = mass * BigInt(feeSetting.priorityBucket.feerate)
      return new BigNumber(sompiFee.toString()).shiftedBy(-this.chainInfo.nativeAssetDecimals)
    }

    throw new Error(`Kaspa: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  private createTransactionsByOutputs = async (outputs: PaymentOutput[], changeAddress: string, priorityFee: Fees): Promise<ReturnType<typeof createTransactions>> => {
    const utxos = await this.rpcClient.getUtxosByAddress(changeAddress)
    const utxoEntries = rpcUtxosToUtxoEntries(utxos)
    return createTransactions(new GeneratorSettings(
      outputs,
      changeAddress,
      utxoEntries,
      kaspaNetworkToNetworkId(this.network),
      priorityFee,
    ))
  }

  private buildKrc20TransferScriptAddress = (to: string, amount: string, tick: string): string => {
    const data = `{"p":"krc-20","op":"transfer","tick":"${tick}","amt":"${amount}","to":"${to}"}`;
    const script = new ScriptBuilder()
      .addData(Buffer.from(this.keyPair.xOnlyPublicKey!, 'hex'))
      .addOp(OpCodes.OpCheckSig)
      .addOp(OpCodes.OpFalse)
      .addOp(OpCodes.OpIf)
      .addData(Buffer.from("kasplex"))
      .addI64(0n)
      .addData(Buffer.from(data))
      .addOp(OpCodes.OpEndIf);

    const P2SHAddress = extractScriptPubKeyAddress(
      script.createPayToScriptHashScript(),
      this.network === 'mainnet' ? AddressPrefix.Mainnet : AddressPrefix.Testnet,
    )!;
    
    return P2SHAddress.toString()
  }
}
