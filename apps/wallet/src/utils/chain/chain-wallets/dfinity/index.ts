import BigNumber from "bignumber.js";
import { AssetInfo, BaseChainWallet } from "../types";
import { Chain, ChainAssetType, ChainInfo } from "../../../basicTypes";
import { Buffer } from 'buffer/';
import { WalletAccount } from "@delandlabs/hibit-id-sdk";
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { createAgent } from '@dfinity/utils'
import { HttpAgent } from "@dfinity/agent";
import { AccountIdentifier, LedgerCanister } from '@dfinity/ledger-icp'
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";

const ICP_LEDGER_CANISTER_ID = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

export class DfinityChainWallet extends BaseChainWallet {
  private identity: Secp256k1KeyIdentity | null = null
  private agent: HttpAgent | null = null
  private readyPromise: Promise<void>

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(Chain.Dfinity)) {
      throw new Error('Dfinity: invalid chain type');
    }
    super(chainInfo, phrase)
    this.readyPromise = new Promise((resolve) => {
      this.initWallet(phrase).then(resolve)
    })
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    await this.readyPromise
    const address = this.identity!.getPrincipal().toString()
    return {
      address,
      publicKey: Buffer.from(this.identity!.getPublicKey().toRaw()).toString('hex'),
    } as WalletAccount
  }

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    if (!message) {
      throw new Error('Dfinity: Missing sign data');
    }
    await this.readyPromise
    const signature = await this.identity!.sign(Buffer.from(message, "utf8"))
    return Buffer.from(signature).toString('hex')
  }

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(Chain.Dfinity)) {
      throw new Error('Dfinity: invalid asset chain');
    }

    await this.readyPromise
    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const ledger = this.getIcpLedger();
      const balance = await ledger.accountBalance({
        accountIdentifier: AccountIdentifier.fromPrincipal({
          principal: Principal.fromText(address)
        })
      })
      return new BigNumber(String(balance)).shiftedBy(-assetInfo.decimalPlaces.value)
    }
    // ICRC
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICRC1)) {
      const ledger = this.getIcrcLedger(assetInfo.contractAddress)
      const balance = await ledger.balance({
        owner: Principal.fromText(address)
      })
      return new BigNumber(String(balance)).shiftedBy(-assetInfo.decimalPlaces.value)
    }

    throw new Error(`Dfinity: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(Chain.Dfinity)) {
      throw new Error('Dfinity: invalid asset chain');
    }
    await this.readyPromise

    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const ledger = this.getIcpLedger()
      const blockHeight = await ledger.transfer({
        to: AccountIdentifier.fromPrincipal({
          principal: Principal.fromText(toAddress)
        }),
        amount: BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString())
      })
      console.debug(`Dfinity: ICP transfer blockHeight ${blockHeight}`)
      return ''
    }
    // ICRC
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICRC1)) {
      const ledger = this.getIcrcLedger(assetInfo.contractAddress)
      const blockIndex = await ledger.transfer({
        to: {
          owner: Principal.fromText(toAddress),
          subaccount: [],
        },
        amount: BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString()),
      })
      console.debug(`Dfinity: ICRC transfer blockIndex ${blockIndex}`)
      return ''
    }

    throw new Error(`Dfinity: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  public override getEstimatedFee = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<BigNumber> => {
    if (!assetInfo.chain.equals(Chain.Dfinity)) {
      throw new Error('Dfinity: invalid asset chain');
    }
    await this.readyPromise

    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.Native)) {
      const ledger = this.getIcpLedger()
      const fee = await ledger.transactionFee()
      return new BigNumber(String(fee)).shiftedBy(-assetInfo.decimalPlaces.value)
    }

    // ICRC
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICRC1)) {
      const ledger = this.getIcrcLedger(assetInfo.contractAddress)
      const fee = await ledger.transactionFee({})
      return new BigNumber(String(fee)).shiftedBy(-assetInfo.decimalPlaces.value)
    }

    throw new Error(`Dfinity: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  private initWallet = async (phrase: string) => {
    this.identity = Secp256k1KeyIdentity.fromSeedPhrase(phrase)
    this.agent = await createAgent({
      identity: this.identity,
    })
  }

  private getIcpLedger = () => {
    return LedgerCanister.create({
      agent: this.agent!,
      canisterId: ICP_LEDGER_CANISTER_ID,
    })
  }

  private getIcrcLedger = (canisterId: string) => {
    return IcrcLedgerCanister.create({
      agent: this.agent!,
      canisterId: Principal.fromText(canisterId),
    })
  }
}
