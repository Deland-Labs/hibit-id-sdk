import BigNumber from 'bignumber.js';
import { AssetInfo, BaseChainWallet, Chain, ChainAssetType, ChainInfo } from '@delandlabs/coin-base'
import { WalletAccount } from '@delandlabs/hibit-id-sdk';
import {
  Address,
  Encoding,
  Fees,
  GeneratorSettings,
  Hash,
  KaspaNetwork,
  KaspaRpc,
  kaspaToSompi,
  Keypair,
  NetworkId,
  SendKasParams,
  SendKrc20Params
} from '..';
import { HDNodeWallet } from 'ethers';
import {
  createTransactions,
  kaspaNetworkToNetworkId,
  rpcUtxosToUtxoEntries
} from './utils';

const DERIVING_PATH = "m/44'/111111'/0'/0/0";
const AMOUNT_FOR_INSCRIBE = kaspaToSompi('0.3');

export class KaspaChainWallet extends BaseChainWallet {
  private network: KaspaNetwork;
  private networkId: NetworkId;
  private rpcClient: KaspaRpc;
  private keyPair: Keypair;
  private encoding: Encoding = Encoding.JSON;

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid chain type');
    }
    super(chainInfo, phrase);
    this.network = chainInfo.isMainnet ? 'mainnet' : 'testnet-10';
    this.networkId = kaspaNetworkToNetworkId(this.network);
    const endpoint = this.network === 'mainnet'
      ? import.meta.env.VITE_HIBIT_KASPA_MAINNET_ENDPOINT
      : import.meta.env.VITE_HIBIT_KASPA_TESTNET_ENDPOINT;
    this.rpcClient = new KaspaRpc(
      this.networkId,
      this.encoding,
      endpoint, // ! TEMP: use endpoint for now
    );
    const hdWallet = HDNodeWallet.fromPhrase(phrase, undefined, DERIVING_PATH);
    const privKey = hdWallet.privateKey;
    this.keyPair = Keypair.fromPrivateKeyHex(privKey.slice(2));
    console.debug(privKey, this.keyPair);
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    return {
      address: this.keyPair.toAddress(this.networkId.networkType).toString(),
      publicKey: this.keyPair.publicKey
    };
  };

  public override signMessage: (message: string) => Promise<string> = async (
    message
  ) => {
    const signature = this.keyPair.signMessageWithAuxData(
      Buffer.from(message),
      new Uint8Array(32).fill(0)
    );
    return Buffer.from(signature).toString('hex');
  };

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid asset chain');
    }
    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      try {
        const balance = await this.rpcClient.getBalance(address);
        return new BigNumber(balance).shiftedBy(-assetInfo.decimalPlaces.value);
      }
      catch (e) {
        console.error(e);
        return new BigNumber(0);
      }
    }
    // krc20
    if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
      const balanceInfo = await this.rpcClient.getKrc20Balance(
        address,
        assetInfo.contractAddress
      );
      return balanceInfo
        ? new BigNumber(balanceInfo.balance).shiftedBy(-Number(balanceInfo.dec))
        : new BigNumber(0);
    }

    throw new Error(
      `Kaspa: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`
    );
  };

  public override transfer = async (
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<string> => {
    if (!assetInfo.chain.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid asset chain');
    }
    try {
      // native
      if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
        const sendParam = new SendKasParams(
          this.keyPair.toAddress(this.networkId.networkType),
          BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
          Address.fromString(toAddress),
          this.networkId,
          new Fees(0n)
        );
        const {
          result: { transactions, summary }
        } = await this.createTransactionsByOutputs(sendParam);
        for (const tx of transactions) {
          const signedTx = tx.sign([this.keyPair.privateKey!]);
          const reqMessage = signedTx.toSubmitableJson();
          await this.rpcClient.submitTransaction({
            transaction: reqMessage as any,
            allowOrphan: false
          });
        }
        return summary.finalTransactionId?.toString() ?? '';
      }
      // krc20
      if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
        // inscribe transactions
        const sendKrc20Param = new SendKrc20Params(
          this.keyPair.toAddress(this.networkId.networkType),
          BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
          toAddress,
          assetInfo.contractAddress,
          this.networkId,
          AMOUNT_FOR_INSCRIBE,
          new Fees(0n)
        );
        const {
          result: { transactions: commitTxs }
        } = await this.createTransactionsByOutputs(sendKrc20Param);
        let commitTxId = '';
        for (const commitTx of commitTxs) {
          const signedTx = commitTx.sign([this.keyPair.privateKey!]);
          const reqMessage = signedTx.toSubmitableJson();
          commitTxId = await this.rpcClient.submitTransaction({
            transaction: reqMessage as any,
            allowOrphan: false
          });
        }
        console.log('commitTxId', commitTxId);

        const {
          result: { transactions: revealTxs }
        } = await this.createTransactionsByOutputs(sendKrc20Param, commitTxId);
        let revealTxId = '';
        for (const revealTx of revealTxs) {
          // sign
          const signedTx = revealTx.sign([this.keyPair.privateKey!], false);
          const ourOutput = signedTx.transaction.tx.inputs.findIndex(
            (input) => Buffer.from(input.signatureScript).toString('hex') === ''
          );
          if (ourOutput !== -1) {
            const signature = signedTx.transaction.createInputSignature(
              ourOutput,
              this.keyPair.privateKey!
            );
            const encodedSignature =
              sendKrc20Param.script.encodePayToScriptHashSignatureScript(
                signature
              );
            signedTx.transaction.fillInputSignature(
              ourOutput,
              encodedSignature
            );
          }
          const reqMessage = signedTx.toSubmitableJson();
          console.log('reqMessage', reqMessage);
          revealTxId = await this.rpcClient.submitTransaction({
            transaction: reqMessage as any,
            allowOrphan: false
          });
        }
        console.log('revealTxId', revealTxId);

        return revealTxId;
      }
    } catch (e) {
      console.error(e);
      // TODO: handle error
      throw e;
    }

    throw new Error(
      `Kaspa: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`
    );
  };

  public override getEstimatedFee = async (
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<BigNumber> => {
    if (!assetInfo.chain.equals(Chain.Kaspa)) {
      throw new Error('Kaspa: invalid asset chain');
    }
    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const sendKasParam = new SendKasParams(
        this.keyPair.toAddress(this.networkId.networkType),
        BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
        Address.fromString(toAddress),
        this.networkId,
        new Fees(0n)
      );
      const { priorityFee } =
        await this.createTransactionsByOutputs(sendKasParam);
      return new BigNumber(priorityFee.amount.toString()).shiftedBy(
        -assetInfo.decimalPlaces.value
      );
    }
    // krc20
    if (assetInfo.chainAssetType.equals(ChainAssetType.KRC20)) {
      const sendKrc20Param = new SendKrc20Params(
        this.keyPair.toAddress(this.networkId.networkType),
        BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
        toAddress,
        assetInfo.contractAddress,
        this.networkId,
        AMOUNT_FOR_INSCRIBE,
        new Fees(0n)
      );
      const { priorityFee } =
        await this.createTransactionsByOutputs(sendKrc20Param);
      return new BigNumber(priorityFee.amount.toString()).shiftedBy(
        -this.chainInfo.nativeAssetDecimals
      );
    }

    throw new Error(
      `Kaspa: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`
    );
  };

  private createTransactionsByOutputs = async (
    sendParam: SendKasParams | SendKrc20Params,
    commitTxId?: string
  ): Promise<{
    priorityFee: Fees;
    result: ReturnType<typeof createTransactions>;
  }> => {
    const isKrc20Tx = sendParam instanceof SendKrc20Params;
    const isReveal = commitTxId !== undefined;
    if (!isKrc20Tx && isReveal) {
      throw new Error('Kaspa: invalid sendParam');
    }

    const utxos = await this.rpcClient.getUtxosByAddress(
      sendParam.sender.toString()
    );
    console.log(
      'utxos',
      utxos.map((utxo) => utxo.outpoint?.transactionId),
      utxos
    );
    const utxoEntries = rpcUtxosToUtxoEntries(utxos);
    const settings: GeneratorSettings = !isKrc20Tx
      ? (sendParam as SendKasParams).toGeneratorSettings(utxoEntries)
      : !isReveal
        ? (sendParam as SendKrc20Params).toCommitTxGeneratorSettings(
            utxoEntries
          )
        : (sendParam as SendKrc20Params).toRevealTxGeneratorSettings(
            utxoEntries,
            Hash.fromHex(commitTxId)
          );
    const txResult = createTransactions(settings);
    if (sendParam.priorityFee?.amount) {
      return {
        priorityFee: sendParam.priorityFee,
        result: txResult
      };
    }
    // calculate fee if priorityFee is not set
    // and return actual transactions with calculated fee
    const feeSetting = await this.rpcClient.getFeeEstimate();
    const mass =
      txResult.transactions[txResult.transactions.length - 1].tx.mass;
    const sompiFee = mass * BigInt(feeSetting?.priorityBucket?.feerate ?? 1n);
    const txResultWithFee = createTransactions(
      settings.setPriorityFee(new Fees(sompiFee))
    );
    return {
      priorityFee: new Fees(sompiFee),
      result: txResultWithFee
    };
  };
}
