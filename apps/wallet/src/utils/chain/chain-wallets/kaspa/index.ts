import BigNumber from "bignumber.js";
import { AssetInfo, BaseChainWallet } from "../types";
import { Chain, ChainAssetType, ChainId, ChainInfo } from "../../../basicTypes";
import { WalletAccount } from "@delandlabs/hibit-id-sdk";
import { GeneratorSettings, KaspaNetwork, KaspaRpc, Keypair, PaymentOutput, ScriptBuilder, OpCodes, Address, NetworkId, kaspaToSompi, Fees, UtxoEntryReference, addressFromScriptPublicKey, TransactionOutpoint, Hash } from '@delandlabs/coin-kaspa-rpc'
import { getChainByChainId } from "../..";
import { HDNodeWallet } from "ethers";
import { createTransactions, kaspaNetworkToNetworkId, rpcUtxosToUtxoEntries } from "./utils";
import { sleep } from "../../common";

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
    try {
      // native
      if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
        const { result: { transactions, summary } } = await this.createTransactionsByOutputs(
          [new PaymentOutput(
            Address.fromString(toAddress),
            BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
        )],
          this.keyPair.toAddress(this.networkId.networkType),
        )
        for (const tx of transactions) {
          const signedTx = tx.sign([this.keyPair.privateKey!])
          const reqMessage = signedTx.toSubmitable()
          await this.rpcClient.submitTransaction({
            transaction: reqMessage as any,
            allowOrphan: false,
          })
        }
        return summary.finalTransactionId?.toString() ?? ''
      }
      // krc20
      if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
        // inscribe transactions
        const { P2SHAddress } = this.buildKrc20TransferScript(
          toAddress,
          amount.shiftedBy(assetInfo.decimalPlaces.value).toString(),
          assetInfo.contractAddress
        )
        const { result: { transactions: commitTxs } } = await this.createTransactionsByOutputs(
          [new PaymentOutput(
            P2SHAddress,
            AMOUNT_FOR_INSCRIBE,
          )],
          this.keyPair.toAddress(this.networkId.networkType),
        )
        let commitTxId = ''
        for (const commitTx of commitTxs) {
          const signedTx = commitTx.sign([this.keyPair.privateKey!])
          const reqMessage = signedTx.toSubmitable()
          const txId = await this.rpcClient.submitTransaction({
            transaction: reqMessage as any,
            allowOrphan: false,
          })
          commitTxId = txId
        }
        // TODO: wait for event
        await sleep(20000)
        console.log('commitTxId', commitTxId)
        // reveal transactions
        const { script: revealScript, P2SHAddress: revealP2SHAddress } = this.buildKrc20TransferScript(
          toAddress,
          amount.shiftedBy(assetInfo.decimalPlaces.value).toString(),
          assetInfo.contractAddress
        )
        const inputsFromCommitTx = new UtxoEntryReference(
          revealP2SHAddress,
          new TransactionOutpoint(
            Hash.fromHex(commitTxId),
            0,
          ),
          AMOUNT_FOR_INSCRIBE,
          revealScript.createPayToScriptHashScript(),
          0n,
          false,
        )
        // const revealUTXOs = await this.rpcClient.getUtxosByAddress(P2SHAddress.toString());
        // const revealUTXOEntries = rpcUtxosToUtxoEntries(revealUTXOs)
        const { result: { transactions: revealTxs } } = await this.createTransactionsByOutputs(
          [],
          this.keyPair.toAddress(this.networkId.networkType),
          undefined,
          // [revealUTXOEntries[0]]
          [inputsFromCommitTx]
        );
        let revealTxId = ''
        for (const revealTx of revealTxs) {
          // sign
          const signedTx = revealTx.sign([this.keyPair.privateKey!], false)
          const ourOutput = signedTx.transaction.tx.inputs.findIndex(
            (input) => Buffer.from(input.signatureScript).toString('hex') === ''
          );
          if (ourOutput !== -1) {
            const signature = signedTx.transaction.createInputSignature(ourOutput, this.keyPair.privateKey!);
            const encodedSignature = revealScript.encodePayToScriptHashSignatureScript(signature);
            signedTx.transaction.fillInputSignature(
              ourOutput,
              Buffer.from(encodedSignature, 'hex')
            );
          }
          const reqMessage = signedTx.toSubmitable()
          const txId = await this.rpcClient.submitTransaction({
            transaction: reqMessage as any,
            allowOrphan: false,
          })
          revealTxId = txId
        }
        console.log('revealTxId', revealTxId)

        return revealTxId
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
      const { priorityFee } = await this.createTransactionsByOutputs(
        [new PaymentOutput(
          Address.fromString(toAddress),
          BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
        )],
        this.keyPair.toAddress(this.networkId.networkType),
      )
      return new BigNumber(priorityFee.amount.toString()).shiftedBy(-assetInfo.decimalPlaces.value)
    }
    // krc20
    if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
      const { P2SHAddress } = this.buildKrc20TransferScript(toAddress, amount.shiftedBy(assetInfo.decimalPlaces.value).toString(), assetInfo.contractAddress)
      const { priorityFee } = await this.createTransactionsByOutputs(
        [new PaymentOutput(
          P2SHAddress,
          AMOUNT_FOR_INSCRIBE,
        )],
        this.keyPair.toAddress(this.networkId.networkType),
      )
      return new BigNumber(priorityFee.amount.toString()).shiftedBy(-this.chainInfo.nativeAssetDecimals)
    }

    throw new Error(`Kaspa: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  private createTransactionsByOutputs = async (outputs: PaymentOutput[], changeAddress: Address, priorityFee?: Fees, priorityEntries?: UtxoEntryReference[]): Promise<{
    priorityFee: Fees
    result: ReturnType<typeof createTransactions>
  }> => {
    const utxos = await this.rpcClient.getUtxosByAddress(changeAddress.toString())
    console.log('utxos', utxos.map((utxo) => utxo.outpoint?.transactionId), utxos)
    const utxoEntries = rpcUtxosToUtxoEntries(utxos)
    const txResult = createTransactions(new GeneratorSettings(
      outputs,
      changeAddress,
      utxoEntries,
      kaspaNetworkToNetworkId(this.network),
      !priorityFee?.amount ? new Fees(0n) : priorityFee,
      priorityEntries ? [...priorityEntries] : undefined,
      priorityEntries ? 0 : undefined
    ))
    if (priorityFee?.amount) {
      return {
        priorityFee,
        result: txResult,
      }
    }
    // calculate fee if priorityFee is not set
    // and return actual transactions with calculated fee
    const feeSetting = await this.rpcClient.getFeeEstimate()
    const mass = txResult.transactions[txResult.transactions.length - 1].tx.mass
    const sompiFee = mass * BigInt(feeSetting?.priorityBucket?.feerate ?? 1n)
    const txResultWithFee = createTransactions(new GeneratorSettings(
      outputs,
      changeAddress,
      utxoEntries,
      kaspaNetworkToNetworkId(this.network),
      new Fees(sompiFee),
      priorityEntries ? [...priorityEntries] : undefined,
      priorityEntries ? 0 : undefined
    ))
    return {
      priorityFee: new Fees(sompiFee),
      result: txResultWithFee,
    }
  }

  private buildKrc20TransferScript = (to: string, amount: string, tick: string): {
    script: ScriptBuilder
    P2SHAddress: Address
  } => {
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

    const P2SHAddress = addressFromScriptPublicKey(
      script.createPayToScriptHashScript(),
      this.networkId.networkType,
    );
    
    return {
      script,
      P2SHAddress
    }
  }
}
