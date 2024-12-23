import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer/';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { bytesToHex, hexToBytes } from '@openproduct/web-sdk';
import {
  Address,
  beginCell,
  Cell,
  fromNano,
  internal,
  JettonMaster,
  JettonWallet,
  OpenedContract,
  SendMode,
  StateInit,
  storeMessage,
  toNano,
  TonClient,
  WalletContractV4
} from '@ton/ton';
import { KeyPair, mnemonicToPrivateKey } from '@ton/crypto';
import { external, storeStateInit } from '@ton/core';
import nacl from 'tweetnacl';
import { AssetInfo, BaseChainWallet, ChainInfo, ChainNetwork, WalletAccount } from '@delandlabs/coin-base';
import { TonConnectSignDataPayload, TonConnectSignDataResult, TonConnectTransactionPayload } from '../ton-connect';
import { sleep } from './utils';
import { CHAIN, CHAIN_NAME, FT_ASSET, NATIVE_ASSET, MAGIC_BYTES } from './defaults';

const JETTON_TRANSFER_AMOUNT = new BigNumber(0.1);
const JETTON_FORWARD_AMOUNT = new BigNumber(0.0001);

export class TonChainWallet extends BaseChainWallet {
  private keyPair: KeyPair | null = null;
  private client: TonClient | null = null;
  private wallet: OpenedContract<WalletContractV4> | null = null;
  private readyPromise: Promise<void>;

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid chain type`);
    }
    super(chainInfo, phrase);
    this.readyPromise = new Promise((resolve) => {
      this.initWallet(phrase).then(resolve);
    });
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    await this.readyPromise;
    const address = this.wallet!.address;
    return {
      address: address.toString({
        urlSafe: true,
        bounceable: false,
        testOnly: this.getIsTestNet()
      }),
      publicKey: this.wallet!.publicKey.toString('hex')
    };
  };

  // ref: OpenMask extension
  public override signMessage: (message: string) => Promise<string> = async (message) => {
    if (!message) {
      throw new Error(`${CHAIN_NAME}: Missing sign data`);
    }
    await this.readyPromise;
    const valueHash = nacl.hash(Buffer.from(message, 'utf8'));
    /**
     * According: https://github.com/ton-foundation/specs/blob/main/specs/wtf-0002.md
     */
    if (valueHash.length + MAGIC_BYTES >= 127) {
      throw new Error(`${CHAIN_NAME}: Too large personal message`);
    }
    const hex = Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from('ton-safe-sign-magic'), valueHash]).toString(
      'hex'
    );
    const signature = nacl.sign.detached(hexToBytes(hex), this.keyPair!.secretKey);
    return bytesToHex(signature);
  };

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    try {
      Address.parse(address);
    } catch (e) {
      throw new Error(`${CHAIN_NAME}: invalid wallet address`);
    }
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    await this.readyPromise;

    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const addr = Address.parse(address);
      const balance = await this.client!.getBalance(addr);
      return new BigNumber(fromNano(balance));
    }
    // jetton
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      const jettonWallet = await this.getJettonWallet(address, assetInfo.contractAddress);
      const balance = await jettonWallet.getBalance();
      return new BigNumber(String(balance)).shiftedBy(-assetInfo.decimalPlaces.value);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    await this.readyPromise;

    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const seqno = (await this.wallet!.getSeqno()) || 0;
      const transfer = await this.wallet!.createTransfer({
        seqno: seqno,
        secretKey: this.keyPair!.secretKey,
        messages: [
          internal({
            value: toNano(amount.toString()),
            to: Address.parse(toAddress),
            bounce: this.getAddressBounceable(toAddress)
          })
        ],
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS
      });

      // Send transaction
      await this.wallet!.send(transfer);

      // Get transaction hash
      const msgHash = transfer.hash().toString('base64');

      // Wait for confirmation
      let currentSeqno = seqno;
      const MAX_RETRIES = 10;
      let retries = 0;
      while (currentSeqno == seqno) {
        if (retries >= MAX_RETRIES) {
          throw new Error(`${CHAIN_NAME}: transaction confirmation timeout`);
        }
        await sleep(3000);
        currentSeqno = (await this.wallet!.getSeqno()) || 0;
        retries++;
      }
      return msgHash;
    }
    // jetton
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      const ownerAddress = (await this.getAccount()).address;

      // gas check
      const gasBalance = await this.client!.getBalance(Address.parse(ownerAddress));
      const gasBn = new BigNumber(fromNano(gasBalance));
      const minGas = JETTON_TRANSFER_AMOUNT.plus(JETTON_FORWARD_AMOUNT);
      if (gasBn.lt(minGas)) {
        throw new Error(`${CHAIN_NAME}: insufficient gas balance (at least ${minGas.toString()} Ton)`);
      }

      const jettonWallet = await this.getJettonWallet(ownerAddress, assetInfo.contractAddress);

      const forwardPayload = beginCell()
        .storeUint(0, 32) // 0 opcode means we have a comment
        .storeStringTail('Jetton')
        .endCell();

      const messageBody = beginCell()
        .storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
        .storeUint(0, 64) // query id
        .storeCoins(BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString())) // jetton amount
        .storeAddress(Address.parse(toAddress))
        .storeAddress(Address.parse(ownerAddress)) // response destination
        .storeBit(0) // no custom payload
        .storeCoins(toNano(JETTON_FORWARD_AMOUNT.toString())) // forward amount - if >0, will send notification message
        .storeBit(1) // we store forwardPayload as a reference
        .storeRef(forwardPayload)
        .endCell();

      const internalMessage = internal({
        to: jettonWallet.address,
        value: toNano(JETTON_TRANSFER_AMOUNT.toString()),
        bounce: true,
        body: messageBody
      });

      // send jetton
      const seqno = (await this.wallet!.getSeqno()) || 0;
      try {
        const transfer = await this.wallet!.createTransfer({
          seqno: seqno,
          secretKey: this.keyPair!.secretKey,
          messages: [internalMessage],
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS
        });

        await this.wallet!.send(transfer);
        const msgHash = transfer.hash().toString('base64');

        // wait until confirmed
        let currentSeqno = seqno;
        while (currentSeqno == seqno) {
          await sleep(3000);
          currentSeqno = (await this.wallet!.getSeqno()) || 0;
        }
        return msgHash;
      } catch (e: any) {
        const errMsg = e.response?.data?.error || e.message || 'Unknown error';
        if (e.response?.status === 500) {
          if (/^LITE_SERVER_UNKNOWN:[.\s\S]*inbound external message rejected by transaction[.\s\S]*$/i.test(errMsg)) {
            throw new Error(`${CHAIN_NAME}: insufficient gas balance (at least ${minGas} Ton)`);
          }
          throw new Error(`${CHAIN_NAME}: transaction failed - ${errMsg}`);
        }
        throw e;
      }
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override getEstimatedFee = async (
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<BigNumber> => {
    if (!toAddress || !amount || !assetInfo) {
      throw new Error(`${CHAIN_NAME}: Invalid parameters for fee estimation`);
    }
    if (amount.isNaN() || amount.isNegative()) {
      throw new Error(`${CHAIN_NAME}: Invalid amount for fee estimation`);
    }
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    await this.readyPromise;
    const ownerAddress = (await this.getAccount()).address;

    // native
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const body = internal({
        value: toNano(amount.toString()),
        to: Address.parse(toAddress),
        bounce: this.getAddressBounceable(toAddress)
      }).body;
      const feeData = await this.client?.estimateExternalMessageFee(Address.parse(ownerAddress), {
        body,
        initCode: null,
        initData: null,
        ignoreSignature: true
      });
      if (!feeData) {
        throw new Error(`${CHAIN_NAME}: failed to estimate fee`);
      }
      const fee = fromNano(
        String(
          feeData.source_fees.fwd_fee +
          feeData.source_fees.in_fwd_fee +
          feeData.source_fees.storage_fee +
          feeData.source_fees.gas_fee
        )
      );
      return new BigNumber(fee);
    }

    // jetton
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      return JETTON_TRANSFER_AMOUNT.plus(JETTON_FORWARD_AMOUNT);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public tonConnectGetStateInit = (): string => {
    const stateInit = beginCell().storeWritable(storeStateInit(this.wallet!.init)).endCell();
    const base64 = stateInit.toBoc({ idx: true, crc32: true }).toString('base64');
    return base64;
  };

  public tonConnectTransfer = async (payload: TonConnectTransactionPayload): Promise<string> => {
    const seqno = (await this.wallet!.getSeqno()) || 0;
    const transfer = await this.createTonConnectTransfer(seqno, payload);
    await this.wallet!.send(transfer);
    const externalMessage = beginCell()
      .storeWritable(
        storeMessage(
          external({
            to: this.wallet!.address,
            init: seqno === 0 ? this.wallet!.init : undefined,
            body: transfer
          })
        )
      )
      .endCell()
      .toBoc({ idx: false })
      .toString('base64');
    return externalMessage;
  };

  public tonConnectSignData = async (payload: TonConnectSignDataPayload): Promise<TonConnectSignDataResult> => {
    if (!payload?.cell || !payload?.schema_crc) {
      throw new Error(`${CHAIN_NAME}: invalid TonConnect payload`);
    }
    // Validate cell data
    try {
      Cell.fromBase64(payload.cell);
    } catch (e) {
      throw new Error(`${CHAIN_NAME}: Invalid cell data`);
    }
    const timestamp = Date.now() / 1000;
    const X: Cell = Cell.fromBase64(payload.cell); // Payload cell
    const prefix = Buffer.alloc(4 + 8); // version + timestamp
    prefix.writeUInt32BE(payload.schema_crc, 0);
    prefix.writeBigUInt64BE(timestamp, 4);
    const signature = nacl.sign.detached(Buffer.concat([prefix, X.hash()]), this.keyPair!.secretKey);
    return {
      signature: bytesToHex(signature),
      timestamp: timestamp.toString()
    };
  };

  private initWallet = async (phrase: string) => {
    try {
      const endpoint = await getHttpEndpoint({
        network: this.getIsTestNet() ? 'testnet' : 'mainnet'
      });
      this.client = new TonClient({ endpoint });
      const mnemonic = phrase; // your 24 secret words (replace ... with the rest of the words)
      this.keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
      this.wallet = this.client.open(
        WalletContractV4.create({
          workchain: 0,
          publicKey: this.keyPair.publicKey
        })
      );
    } catch (e) {
      throw new Error(`${CHAIN_NAME}: Failed to initialize wallet: ${e}`);
    }
  };

  private getIsTestNet = () => {
    return this.chainInfo.chainId.network.equals(ChainNetwork.TonTestNet);
  };

  private getAddressBounceable = (address: string) => {
    return Address.isFriendly(address) ? Address.parseFriendly(address).isBounceable : false;
  };

  private toStateInit = (stateInit?: string): StateInit | undefined => {
    if (!stateInit) {
      return undefined;
    }
    const initSlice = Cell.fromBase64(stateInit).asSlice();
    return {
      code: initSlice.loadRef(),
      data: initSlice.loadRef()
    };
  };

  private getJettonWallet = async (ownerAddress: string, contractAddress: string) => {
    await this.readyPromise;
    const jettonMaster = this.client!.open(JettonMaster.create(Address.parse(contractAddress)));
    const jettonWalletAddress = await jettonMaster.getWalletAddress(Address.parse(ownerAddress));
    const jettonWallet = this.client!.open(JettonWallet.create(jettonWalletAddress));
    return jettonWallet;
  };

  private createTonConnectTransfer = async (seqno: number, payload: TonConnectTransactionPayload) => {
    await this.readyPromise;
    const transfer = this.wallet!.createTransfer({
      secretKey: this.keyPair!.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: payload.messages.map((item) => {
        return internal({
          to: item.address,
          value: toNano(fromNano(item.amount)),
          bounce: this.getAddressBounceable(item.address),
          init: this.toStateInit(item.stateInit),
          body: item.payload ? Cell.fromBase64(item.payload) : undefined
        });
      })
    });
    return transfer;
  };
}
