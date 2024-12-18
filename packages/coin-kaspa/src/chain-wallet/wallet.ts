import BigNumber from 'bignumber.js';
import { AssetInfo, BaseChainWallet, ChainInfo, WalletAccount } from '@delandlabs/coin-base';
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
import { createTransactions, kaspaNetworkToNetworkId, rpcUtxosToUtxoEntries } from './utils';
import { CHAIN, CHAIN_NAME, DERIVING_PATH, FT_ASSET, NATIVE_ASSET } from './defaults';

const AMOUNT_FOR_INSCRIBE = kaspaToSompi('0.3');

export class KaspaChainWallet extends BaseChainWallet {
  private readonly network: KaspaNetwork;
  private readonly networkId: NetworkId;
  private rpcClient: KaspaRpc;
  private keyPair?: Keypair;
  private encoding: Encoding = Encoding.JSON;

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid chain type`);
    }
    super(chainInfo, phrase);
    this.network = chainInfo.isMainnet ? 'mainnet' : 'testnet-10';
    this.networkId = kaspaNetworkToNetworkId(this.network);
    const endpoint =
      this.network === 'mainnet'
        ? import.meta.env.VITE_HIBIT_KASPA_MAINNET_ENDPOINT
        : import.meta.env.VITE_HIBIT_KASPA_TESTNET_ENDPOINT;
    this.rpcClient = new KaspaRpc(
      this.networkId,
      this.encoding,
      endpoint // ! TEMP: use endpoint for now
    );
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    const keypair = await this.getKeypair();
    return {
      address: keypair.toAddress(this.networkId.networkType).toString(),
      publicKey: keypair.publicKey
    };
  };

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    const keypair = await this.getKeypair();
    const signature = keypair.signMessageWithAuxData(Buffer.from(message), new Uint8Array(32).fill(0));
    return Buffer.from(signature).toString('hex');
  };

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      try {
        const balance = await this.rpcClient.getBalance(address);
        return new BigNumber(balance).shiftedBy(-assetInfo.decimalPlaces.value);
      } catch (e) {
        console.error(e);
        return new BigNumber(0);
      }
    }
    // krc20
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      const balanceInfo = await this.rpcClient.getKrc20Balance(address, assetInfo.contractAddress);
      return balanceInfo ? new BigNumber(balanceInfo.balance).shiftedBy(-Number(balanceInfo.dec)) : new BigNumber(0);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<string> => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    const keypair = await this.getKeypair();
    try {
      // native
      if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
        const sendParam = new SendKasParams(
          keypair.toAddress(this.networkId.networkType),
          BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
          Address.fromString(toAddress),
          this.networkId,
          new Fees(0n)
        );
        const {
          result: { transactions, summary }
        } = await this.createTransactionsByOutputs(sendParam);
        for (const tx of transactions) {
          const signedTx = tx.sign([keypair.privateKey!]);
          const reqMessage = signedTx.toSubmitableJson();
          await this.rpcClient.submitTransaction({
            transaction: reqMessage as any,
            allowOrphan: false
          });
        }
        return summary.finalTransactionId?.toString() ?? '';
      }
      // krc20
      if (assetInfo.chainAssetType.equals(FT_ASSET)) {
        // inscribe transactions
        const sendKrc20Param = new SendKrc20Params(
          keypair.toAddress(this.networkId.networkType),
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
          const signedTx = commitTx.sign([keypair.privateKey!]);
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
          const signedTx = revealTx.sign([keypair.privateKey!], false);
          const ourOutput = signedTx.transaction.tx.inputs.findIndex(
            (input) => Buffer.from(input.signatureScript).toString('hex') === ''
          );
          if (ourOutput !== -1) {
            const signature = signedTx.transaction.createInputSignature(ourOutput, keypair.privateKey!);
            const encodedSignature = sendKrc20Param.script.encodePayToScriptHashSignatureScript(signature);
            signedTx.transaction.fillInputSignature(ourOutput, encodedSignature);
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

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override getEstimatedFee = async (
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<BigNumber> => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    const keypair = await this.getKeypair();
    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const sendKasParam = new SendKasParams(
        keypair.toAddress(this.networkId.networkType),
        BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
        Address.fromString(toAddress),
        this.networkId,
        new Fees(0n)
      );
      const { priorityFee } = await this.createTransactionsByOutputs(sendKasParam);
      return new BigNumber(priorityFee.amount.toString()).shiftedBy(-assetInfo.decimalPlaces.value);
    }
    // krc20
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      const sendKrc20Param = new SendKrc20Params(
        keypair.toAddress(this.networkId.networkType),
        BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
        toAddress,
        assetInfo.contractAddress,
        this.networkId,
        AMOUNT_FOR_INSCRIBE,
        new Fees(0n)
      );
      const { priorityFee } = await this.createTransactionsByOutputs(sendKrc20Param);
      return new BigNumber(priorityFee.amount.toString()).shiftedBy(-this.chainInfo.nativeAssetDecimals);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
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
      throw new Error(`${CHAIN_NAME}: invalid sendParam`);
    }

    const utxos = await this.rpcClient.getUtxosByAddress(sendParam.sender.toString());
    console.log(
      'utxos',
      utxos.map((utxo) => utxo.outpoint?.transactionId),
      utxos
    );
    const utxoEntries = rpcUtxosToUtxoEntries(utxos);
    const settings: GeneratorSettings = !isKrc20Tx
      ? (sendParam as SendKasParams).toGeneratorSettings(utxoEntries)
      : !isReveal
        ? (sendParam as SendKrc20Params).toCommitTxGeneratorSettings(utxoEntries)
        : (sendParam as SendKrc20Params).toRevealTxGeneratorSettings(utxoEntries, Hash.fromHex(commitTxId));
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
    const mass = txResult.transactions[txResult.transactions.length - 1].tx.mass;
    const sompiFee = mass * BigInt(feeSetting?.priorityBucket?.feerate ?? 1n);
    const txResultWithFee = createTransactions(settings.setPriorityFee(new Fees(sompiFee)));
    return {
      priorityFee: new Fees(sompiFee),
      result: txResultWithFee
    };
  };

  private getKeypair = async (): Promise<Keypair> => {
    if (this.keyPair) {
      return this.keyPair;
    }
    this.keyPair = Keypair.fromPrivateKeyHex(await this.getEcdsaDerivedPrivateKey(DERIVING_PATH));
    return this.keyPair;
  };
}
