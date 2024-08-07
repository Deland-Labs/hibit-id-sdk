import BigNumber from "bignumber.js";
import { AssetInfo, ChainWallet } from "../types";
import { Chain, ChainAssetType, ChainInfo, ChainNetwork } from "../../../basicTypes";
import { Buffer } from 'buffer';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { bytesToHex, hexToBytes } from '@openproduct/web-sdk';
import { sleep } from "../../common";
import { WalletAccount } from "@deland-labs/hibit-id-sdk";
import { TonClient, WalletContractV4, internal, Address, toNano, fromNano, OpenedContract, JettonMaster, JettonWallet, beginCell } from "@ton/ton";
import { KeyPair, mnemonicToPrivateKey } from "@ton/crypto";
import nacl from "tweetnacl";

export class TonChainWallet extends ChainWallet {
  private keyPair: KeyPair | null = null
  private client: TonClient | null = null
  private wallet: OpenedContract<WalletContractV4> | null = null
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
    const address = this.wallet!.address
    return {
      address: address.toString({
        urlSafe: true,
        bounceable: false,
        testOnly: this.getIsTestNet(),
      }),
      publicKey: this.wallet!.publicKey.toString('hex'),
    }
  }

  // ref: OpenMask extension
  public override signMessage: (message: string) => Promise<string> = async (message) => {
    if (!message) {
      throw new Error('Ton: Missing sign data');
    }
    await this.readyPromise
    const valueHash = nacl.hash(Buffer.from(message, "utf8"));
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
    const signature = nacl.sign.detached(hexToBytes(hex), this.keyPair!.secretKey);
    return bytesToHex(signature);
  }

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    try {
      Address.parse(address)
    } catch (e) {
      throw new Error('Ton: invalid wallet address')
    }
    if (!assetInfo.chain.equals(Chain.Ton)) {
      throw new Error('Ethereum: invalid asset chain');
    }
    await this.readyPromise

    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const addr = Address.parse(address)
      const balance = await this.client!.getBalance(addr);
      return new BigNumber(fromNano(balance))
    }
    // jetton
    if (assetInfo.chainAssetType.equals(ChainAssetType.Jetton)) {
      const jettonWallet = await this.getJettonWallet(address, assetInfo.contractAddress)
      const balance = await jettonWallet.getBalance()
      return new BigNumber(String(balance)).shiftedBy(-assetInfo.decimalPlaces.value)
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
      const seqno = await this.wallet!.getSeqno() || 0;
      await this.wallet!.sendTransfer({
        seqno: seqno,
        secretKey: this.keyPair!.secretKey,
        messages: [internal({
          value: toNano(amount.toString()),
          to: Address.parse(toAddress),
        })]
      });
      // wait until confirmed
      let currentSeqno = seqno;
      while (currentSeqno == seqno) {
        await sleep(3000);
        currentSeqno = await this.wallet!.getSeqno() || 0;
      }
      return ''
    }
    // jetton
    if (assetInfo.chainAssetType.equals(ChainAssetType.Jetton)) {
      const ownerAddress = (await this.getAccount()).address
      const jettonWallet = await this.getJettonWallet(ownerAddress, assetInfo.contractAddress)

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
        .storeCoins(toNano('0.0001')) // forward amount - if >0, will send notification message
        .storeBit(1) // we store forwardPayload as a reference
        .storeRef(forwardPayload)
        .endCell();

      const internalMessage = internal({
        to: jettonWallet.address,
        value: toNano('0.1'),
        bounce: true,
        body: messageBody
      });
      
      // send jetton
      const seqno = await this.wallet!.getSeqno() || 0;
      await this.wallet!.sendTransfer({
        seqno: seqno,
        secretKey: this.keyPair!.secretKey,
        messages: [internalMessage],
      })
      // wait until confirmed
      let currentSeqno = seqno;
      while (currentSeqno == seqno) {
        await sleep(3000);
        currentSeqno = await this.wallet!.getSeqno() || 0;
      }
      return ''
    }

    throw new Error(`Ton: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  private initWallet = async (phrase: string) => {
    const endpoint = await getHttpEndpoint({
      network: this.getIsTestNet() ? 'testnet' : 'mainnet',
    })
    this.client = new TonClient({ endpoint });
    const mnemonic = phrase; // your 24 secret words (replace ... with the rest of the words)
    this.keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
    this.wallet = this.client.open(
      WalletContractV4.create({
        workchain: 0,
        publicKey: this.keyPair.publicKey,
      })
    );
  }

  private getIsTestNet = () => {
    return this.chainInfo.chainId.network.equals(ChainNetwork.TonTestNet)
  }

  private getJettonWallet = async (ownerAddress: string, contractAddress: string) => {
    await this.readyPromise
    const jettonMaster = this.client!.open(JettonMaster.create(Address.parse(contractAddress)));
    const jettonWalletAddress = await jettonMaster.getWalletAddress(Address.parse(ownerAddress))
    const jettonWallet = this.client!.open(JettonWallet.create(jettonWalletAddress))
    return jettonWallet
  }
}
