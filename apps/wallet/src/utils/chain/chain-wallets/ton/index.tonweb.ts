import BigNumber from "bignumber.js";
import { AssetInfo, BaseChainWallet } from "../types";
import { Chain, ChainAssetType, ChainInfo, ChainNetwork } from "../../../basicTypes";
import { Buffer } from 'buffer';
import TonWeb from 'tonweb';
import { KeyPair, mnemonicToKeyPair } from "tonweb-mnemonic";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { bytesToHex, hexToBytes } from '@openproduct/web-sdk';
import { WalletV4ContractR2 } from "tonweb/dist/types/contract/wallet/v4/wallet-v4-contract-r2";
import { sleep } from "../../common";
import { WalletAccount } from "@deland-labs/hibit-id-sdk";

const { JettonMinter, JettonWallet } = TonWeb.token.jetton
const { Address, toNano } = TonWeb.utils

export class TonChainWallet extends BaseChainWallet {
  private keyPair: KeyPair | null = null
  private tonweb: TonWeb | null = null
  private wallet: WalletV4ContractR2 | null = null
  private readyPromise: Promise<void>

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(Chain.Ton)) {
      throw new Error('Ton: invalid chain type');
    }
    super(chainInfo, phrase)
    this.readyPromise = new Promise((resolve) => {
      this.initWallet(phrase).then(resolve)
    })
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    await this.readyPromise
    const address = await this.wallet!.getAddress()
    return {
      address: address.toString(true, true, false, this.getIsTestNet()) ?? ''
    }
  }

  // ref: OpenMask extension
  public override signMessage: (message: string) => Promise<string> = async (message) => {
    if (!message) {
      throw new Error('Ton: Missing sign data');
    }
    await this.readyPromise
    const valueHash = this.tonweb!.utils.nacl.hash(Buffer.from(message, "utf8"));
    /**
     * According: https://github.com/ton-foundation/specs/blob/main/specs/wtf-0002.md
     */
    if (valueHash.length + 'ton-safe-sign-magic'.length >= 127) {
      throw new Error('Ton: Too large personal message');
    }
    const hex = Buffer.concat([
      Buffer.from([0xff, 0xff]),
      Buffer.from('ton-safe-sign-magic'),
      valueHash,
    ]).toString('hex');
    const signature = this.tonweb!.utils.nacl.sign.detached(hexToBytes(hex), this.keyPair!.secretKey);
    return bytesToHex(signature);
  }

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    try {
      new Address(address)
    } catch (e) {
      throw new Error('Ton: invalid wallet address')
    }
    if (!assetInfo.chain.equals(Chain.Ton)) {
      throw new Error('Ethereum: invalid asset chain');
    }
    await this.readyPromise

    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const addr = new Address(address)
      const balance = await this.tonweb!.getBalance(addr);
      return new BigNumber(TonWeb.utils.fromNano(balance))
    }
    // jetton
    if (assetInfo.chainAssetType.equals(ChainAssetType.Jetton)) {
      const jettonWallet = await this.getJettonWallet(address, assetInfo.contractAddress)
      const data = await jettonWallet.getData()
      return new BigNumber(data.balance.toString()).shiftedBy(-assetInfo.decimalPlaces.value)
    }

    throw new Error(`Ton: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(Chain.Ton)) {
      throw new Error('Ton: invalid asset chain');
    }
    await this.readyPromise

    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const seqno = await this.wallet!.methods.seqno().call() || 0;
      await this.wallet!.methods.transfer({
        secretKey: this.keyPair!.secretKey,
        toAddress: new Address(toAddress),
        amount: TonWeb.utils.toNano(amount.toString()),
        seqno: seqno,
        // payload: "Hello", // optional comment
        sendMode: 3,
      }).send();
      // wait until confirmed
      let currentSeqno = seqno;
      while (currentSeqno == seqno) {
        await sleep(3000);
        currentSeqno = await this.wallet!.methods.seqno().call() || 0;
      }
      return ''
    }
    // jetton
    if (assetInfo.chainAssetType.equals(ChainAssetType.Jetton)) {
      const ownerAddress = (await this.getAccount()).address
      const jettonWallet = await this.getJettonWallet(ownerAddress, assetInfo.contractAddress)

      // assemble payload
      const payload = await jettonWallet.createTransferBody({
        queryId: new Date().getTime(),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jettonAmount: toNano(amount.toBigNumber().toString()),
        toAddress: new Address(toAddress),
        responseAddress: new Address(ownerAddress),
        forwardAmount: toNano('0.0001'),
        // forwardPayload: new Uint8Array([... new Uint8Array(4), ... new TextEncoder().encode('text comment')]),
      })
      // send jetton
      const seqno = await this.wallet!.methods.seqno().call() || 0;
      await this.wallet!.methods.transfer({
        secretKey: this.keyPair!.secretKey,
        toAddress: await jettonWallet.getAddress(), // address of Jetton wallet of Jetton sender
        amount: TonWeb.utils.toNano('0.1'), // total amount of TONs attached to the transfer message
        seqno: seqno,
        payload: payload,
        sendMode: 3,
      }).send()
      // wait until confirmed
      let currentSeqno = seqno;
      while (currentSeqno == seqno) {
        await sleep(3000);
        currentSeqno = await this.wallet!.methods.seqno().call() || 0;
      }
      return ''
    }

    throw new Error(`Ton: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  private initWallet = async (phrase: string) => {
    const endpoint = await getHttpEndpoint({
      network: this.getIsTestNet() ? 'testnet' : 'mainnet',
    })
    this.tonweb = new TonWeb(new TonWeb.HttpProvider(endpoint));
    const mnemonic = phrase; // your 24 secret words (replace ... with the rest of the words)
    this.keyPair = await mnemonicToKeyPair(mnemonic.split(' '));
    // open wallet v4 (notice the correct wallet version here)
    const WalletClass = this.tonweb.wallet.all["v4R2"];
    this.wallet = new WalletClass(this.tonweb.provider, { publicKey: this.keyPair.publicKey });
  }

  private getIsTestNet = () => {
    return this.chainInfo.chainId.network.equals(ChainNetwork.TonTestNet)
  }

  private getJettonWallet = async (ownerAddress: string, contractAddress: string) => {
    await this.readyPromise
    const minter = new JettonMinter(this.tonweb!.provider, {
      address: new Address(contractAddress),
      adminAddress: new Address(contractAddress),
      jettonContentUri: 'https://ton.org/jetton.json',
      jettonWalletCodeHex: JettonWallet.codeHex
    });
    const jettonWalletAddress = await minter.getJettonWalletAddress(new Address(ownerAddress))
    const jettonWallet = new JettonWallet(this.tonweb!.provider, {
      address: jettonWalletAddress
    })
    return jettonWallet
  }
}
