import BigNumber from 'bignumber.js';
import { AssetInfo, BaseChainWallet, ChainInfo, WalletAccount } from '@delandlabs/coin-base';
import {
  Address,
  Fees,
  GeneratorSettings,
  Hash,
  kaspaToSompi,
  Keypair,
  NetworkId,
  RpcClient,
  Krc20RpcClient,
  Krc20TransferOptions,
  Krc20TransferParams,
  SendKasParams,
  Resolver
} from '@kcoin/kaspa-web3.js';
import { createTransactions } from './utils';
import { CHAIN, CHAIN_NAME, DERIVING_PATH, FT_ASSET, NATIVE_ASSET } from './defaults';

const AMOUNT_FOR_INSCRIBE = kaspaToSompi('0.3');
const DEFAULT_FEES = new Fees(0n);

export class KaspaChainWallet extends BaseChainWallet {
  private readonly networkId: NetworkId;
  private rpcClient: RpcClient;
  private krc20RpcClient: Krc20RpcClient;
  private keyPair?: Keypair;

  constructor(chainInfo: ChainInfo, phrase: string) {
    super(chainInfo, phrase);
    this.validateChain(chainInfo);
    this.networkId = chainInfo.isMainnet ? NetworkId.Mainnet : NetworkId.Testnet10;
    this.rpcClient = new RpcClient({
      networkId: this.networkId,
      resolver: Resolver.createWithEndpoints([this.getEndpoint(chainInfo)])
    });
    this.krc20RpcClient = new Krc20RpcClient({ networkId: this.networkId });
  }

  private validateChain(chainInfo: ChainInfo): void {
    if (!chainInfo.chainId.type.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid chain type`);
    }
  }

  private getEndpoint(chainInfo: ChainInfo): string {
    return chainInfo.isMainnet
      ? import.meta.env.VITE_HIBIT_KASPA_MAINNET_ENDPOINT
      : import.meta.env.VITE_HIBIT_KASPA_TESTNET_ENDPOINT;
  }

  public override getAccount = async (): Promise<WalletAccount> => {
    const keypair = await this.getKeypair();
    return {
      address: keypair.toAddress(this.networkId.networkType).toString(),
      publicKey: keypair.publicKey
    };
  };

  public override signMessage = async (message: string): Promise<string> => {
    const keypair = await this.getKeypair();
    const signature = keypair.signMessageWithAuxData(Buffer.from(message), new Uint8Array(32).fill(0));
    return Buffer.from(signature).toString('hex');
  };

  public override balanceOf = async (address: string, assetInfo: AssetInfo): Promise<BigNumber> => {
    this.validateAssetChain(assetInfo);
    switch (assetInfo.chainAssetType.toString()) {
      case NATIVE_ASSET.toString():
        return this.getNativeBalance(address, assetInfo);
      case FT_ASSET.toString():
        return this.getKrc20Balance(address, assetInfo);
      default:
        throw new Error(`${CHAIN_NAME}: invalid chain asset type`);
    }
  };

  private validateAssetChain(assetInfo: AssetInfo): void {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
  }

  private async getNativeBalance(address: string, assetInfo: AssetInfo): Promise<BigNumber> {
    try {
      const res = await this.rpcClient.getBalanceByAddress(address);
      return new BigNumber(res.balance).shiftedBy(-assetInfo.decimalPlaces.value);
    } catch (e) {
      console.error(e);
      return new BigNumber(0);
    }
  }

  private async getKrc20Balance(address: string, assetInfo: AssetInfo): Promise<BigNumber> {
    const res = await this.krc20RpcClient.getKrc20Balance(address, assetInfo.contractAddress);
    if (res.message !== 'successful' || !res.result) throw new Error(`${CHAIN_NAME}: getKrc20Balance failed`);

    for (const balanceInfo of res.result) {
      if (balanceInfo.tick.toUpperCase() === assetInfo.contractAddress.toUpperCase()) {
        return new BigNumber(balanceInfo.balance).shiftedBy(-Number(balanceInfo.dec));
      }
    }
    throw new Error(`${CHAIN_NAME}: KRC20 balance not found`);
  }

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo, payload?: string): Promise<string> => {
    this.validateAssetChain(assetInfo);
    const keypair = await this.getKeypair();
    return assetInfo.chainAssetType.equals(NATIVE_ASSET)
      ? this.transferNative(toAddress, amount, assetInfo, keypair, payload)
      : this.transferKrc20(toAddress, amount, assetInfo, keypair);
  };

  private async transferNative(
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo,
    keypair: Keypair,
    payload?: string
  ): Promise<string> {
    const sendParam = new SendKasParams(
      keypair.toAddress(this.networkId.networkType),
      BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
      Address.fromString(toAddress),
      this.networkId,
      DEFAULT_FEES,
      payload ? Buffer.from(payload) : undefined
    );
    const {
      result: { transactions, summary }
    } = await this.createTransactionsByOutputs(sendParam);
    for (const tx of transactions) {
      const signedTx = tx.sign([keypair.privateKey!]);
      const reqMessage = signedTx.toSubmittableJsonTx();
      await this.rpcClient.submitTransaction({
        transaction: reqMessage as any,
        allowOrphan: false
      });
    }
    return summary.finalTransactionId?.toString() ?? '';
  }

  private async transferKrc20(
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo,
    keypair: Keypair
  ): Promise<string> {
    const transferOptions: Krc20TransferOptions = {
      tick: assetInfo.contractAddress,
      to: toAddress,
      amount: BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString())
    };
    const krc20TransferParams = new Krc20TransferParams(
      keypair.toAddress(this.networkId.networkType),
      this.networkId,
      DEFAULT_FEES,
      transferOptions,
      DEFAULT_FEES,
      AMOUNT_FOR_INSCRIBE
    );
    const commitTxId = await this.processKrc20Transactions(krc20TransferParams);
    return this.revealKrc20Transactions(krc20TransferParams, commitTxId, keypair);
  }

  private async processKrc20Transactions(krc20TransferParams: Krc20TransferParams): Promise<string> {
    const {
      result: { transactions: commitTxs }
    } = await this.createTransactionsByOutputs(krc20TransferParams);
    let commitTxId = '';
    for (const commitTx of commitTxs) {
      const signedTx = commitTx.sign([this.keyPair!.privateKey!]);
      const reqMessage = signedTx.toSubmittableJsonTx();
      const commitRes = await this.rpcClient.submitTransaction({
        transaction: reqMessage as any,
        allowOrphan: false
      });
      commitTxId = commitRes.transactionId;
    }
    console.debug('commitTxId', commitTxId);
    return commitTxId;
  }

  private async revealKrc20Transactions(
    krc20TransferParams: Krc20TransferParams,
    commitTxId: string,
    keypair: Keypair
  ): Promise<string> {
    const {
      result: { transactions: revealTxs }
    } = await this.createTransactionsByOutputs(krc20TransferParams, commitTxId);
    let revealTxId = '';
    for (const revealTx of revealTxs) {
      const signedTx = revealTx.sign([keypair.privateKey!], false);
      const ourOutput = signedTx.transaction.tx.inputs.findIndex(
        (input) => Buffer.from(input.signatureScript).toString('hex') === ''
      );
      if (ourOutput !== -1) {
        const signature = signedTx.transaction.createInputSignature(ourOutput, keypair.privateKey!);
        const encodedSignature = krc20TransferParams.script.encodePayToScriptHashSignatureScript(signature);
        signedTx.transaction.fillInputSignature(ourOutput, encodedSignature);
      }
      const reqMessage = signedTx.toSubmittableJsonTx();
      console.debug('reqMessage', reqMessage);
      const revealRes = await this.rpcClient.submitTransaction({
        transaction: reqMessage as any,
        allowOrphan: false
      });
      revealTxId = revealRes.transactionId;
    }
    console.debug('revealTxId', revealTxId);
    return revealTxId;
  }

  public override getEstimatedFee = async (
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<BigNumber> => {
    this.validateAssetChain(assetInfo);
    const keypair = await this.getKeypair();
    return assetInfo.chainAssetType.equals(NATIVE_ASSET)
      ? this.estimateNativeFee(toAddress, amount, assetInfo, keypair)
      : this.estimateKrc20Fee(toAddress, amount, assetInfo, keypair);
  };

  private async estimateNativeFee(
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo,
    keypair: Keypair
  ): Promise<BigNumber> {
    const sendKasParam = new SendKasParams(
      keypair.toAddress(this.networkId.networkType),
      BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
      Address.fromString(toAddress),
      this.networkId,
      DEFAULT_FEES
    );
    const { priorityFee } = await this.createTransactionsByOutputs(sendKasParam);
    return new BigNumber(priorityFee.amount.toString()).shiftedBy(-assetInfo.decimalPlaces.value);
  }

  private async estimateKrc20Fee(
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo,
    keypair: Keypair
  ): Promise<BigNumber> {
    const transferOptions: Krc20TransferOptions = {
      tick: assetInfo.contractAddress,
      to: toAddress,
      amount: BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString())
    };
    const krc20TransferParams = new Krc20TransferParams(
      keypair.toAddress(this.networkId.networkType),
      this.networkId,
      DEFAULT_FEES,
      transferOptions,
      DEFAULT_FEES,
      AMOUNT_FOR_INSCRIBE
    );
    const { priorityFee } = await this.createTransactionsByOutputs(krc20TransferParams);
    return new BigNumber(priorityFee.amount.toString()).shiftedBy(-this.chainInfo.nativeAssetDecimals);
  }

  private createTransactionsByOutputs = async (
    sendParam: SendKasParams | Krc20TransferParams,
    commitTxId?: string
  ): Promise<{
    priorityFee: Fees;
    result: ReturnType<typeof createTransactions>;
  }> => {
    const isKrc20Tx = sendParam instanceof Krc20TransferParams;
    const isReveal = commitTxId !== undefined;
    if (!isKrc20Tx && isReveal) {
      throw new Error(`${CHAIN_NAME}: invalid sendParam`);
    }

    const { entries: utxos } = await this.rpcClient.getUtxosByAddresses([sendParam.sender.toString()]);
    console.debug(
      'utxos',
      utxos.map((utxo) => utxo.outpoint?.transactionId),
      utxos
    );
    const settings: GeneratorSettings = !isKrc20Tx
      ? (sendParam as SendKasParams).toGeneratorSettings(utxos)
      : !isReveal
        ? (sendParam as Krc20TransferParams).toCommitTxGeneratorSettings(utxos)
        : (sendParam as Krc20TransferParams).toRevealTxGeneratorSettings(utxos, Hash.fromHex(commitTxId));
    const txResult = createTransactions(settings);
    const priorityFee = !isKrc20Tx
      ? sendParam.priorityFee
      : isReveal
        ? sendParam.commitTxPriorityFee
        : sendParam.revealPriorityFee;
    if (priorityFee?.amount) {
      return {
        priorityFee,
        result: txResult
      };
    }
    // calculate fee if priorityFee is not set
    // and return actual transactions with calculated fee
    const res = await this.rpcClient.getFeeEstimate();
    const mass = txResult.transactions[txResult.transactions.length - 1].tx.mass;
    const sompiFee = new BigNumber(mass.toString()).times(res.estimate?.priorityBucket?.feerate ?? 1).toFixed(0);
    const txResultWithFee = createTransactions(settings.setPriorityFee(new Fees(BigInt(sompiFee))));
    return {
      priorityFee: new Fees(BigInt(sompiFee)),
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
