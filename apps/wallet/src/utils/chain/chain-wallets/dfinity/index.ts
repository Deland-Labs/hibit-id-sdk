import BigNumber from "bignumber.js";
import { AssetInfo, BaseChainWallet } from "../types";
import { Chain, ChainAssetType, ChainInfo } from "../../../basicTypes";
import { Buffer } from 'buffer/';
import { WalletAccount } from "@delandlabs/hibit-id-sdk";
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { createAgent } from '@dfinity/utils'
import { HttpAgent } from "@dfinity/agent";
import { AccountIdentifier, LedgerCanister } from '@dfinity/ledger-icp'
import { IcrcLedgerCanister, IcrcMetadataResponseEntries } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { Icrc49CallCanisterRequest, Icrc49CallCanisterResult, IcrcErrorCode, JsonRpcResponseError, JsonRpcResponseSuccess } from "./types";
import { buildJsonRpcError, buildJsonRpcResponse } from "./utils";
import * as cbor from 'cborg';
import { RUNTIME_ICRC_DEV, RUNTIME_ICRC_HOST } from "../../../runtime";

const ICP_LEDGER_CANISTER_ID = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

export class DfinityChainWallet extends BaseChainWallet {
  private identity: Secp256k1KeyIdentity | null = null
  private agent: HttpAgent | null = null
  private readyPromise: Promise<void>
  private feeCache: Record<string | 'native', BigNumber> = {}

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
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICP)) {
      const ledger = this.getIcpLedger();
      const balance = await ledger.accountBalance({
        accountIdentifier: AccountIdentifier.fromPrincipal({
          principal: Principal.fromText(address)
        })
      })
      return new BigNumber(String(balance)).shiftedBy(-assetInfo.decimalPlaces.value)
    }
    // ICRC
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICRC3)) {
      const ledger = this.getIcrcLedger(assetInfo.contractAddress)
      const balance = await ledger.balance({
        owner: Principal.fromText(address)
      })
      const decimals = assetInfo.decimalPlaces?.value ?? (await this.getIcrcDecimals(ledger))
      return new BigNumber(String(balance)).shiftedBy(-decimals)
    }

    throw new Error(`Dfinity: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(Chain.Dfinity)) {
      throw new Error('Dfinity: invalid asset chain');
    }
    await this.readyPromise

    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICP)) {
      const ledger = this.getIcpLedger()
      const blockHeight = await ledger.transfer({
        to: AccountIdentifier.fromPrincipal({
          principal: Principal.fromText(toAddress)
        }),
        amount: BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toString())
      })
      console.debug(`Dfinity: ICP transfer blockHeight ${blockHeight}`)
      return String(blockHeight)
    }
    // ICRC
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICRC3)) {
      const ledger = this.getIcrcLedger(assetInfo.contractAddress)
      const decimals = assetInfo.decimalPlaces?.value ?? (await this.getIcrcDecimals(ledger))
      const blockIndex = await ledger.transfer({
        to: {
          owner: Principal.fromText(toAddress),
          subaccount: [],
        },
        amount: BigInt(amount.shiftedBy(decimals).toString()),
      })
      console.debug(`Dfinity: ICRC transfer blockIndex ${blockIndex}`)
      return String(blockIndex)
    }

    throw new Error(`Dfinity: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  public override getEstimatedFee = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<BigNumber> => {
    if (!assetInfo.chain.equals(Chain.Dfinity)) {
      throw new Error('Dfinity: invalid asset chain');
    }
    await this.readyPromise

    // native
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICP)) {
      if (this.feeCache['native']) {
        return this.feeCache['native']
      }
      const ledger = this.getIcpLedger()
      const fee = await ledger.transactionFee()
      const result = new BigNumber(String(fee)).shiftedBy(-assetInfo.decimalPlaces.value)
      this.feeCache['native'] = result
      return result
    }

    // ICRC
    if (assetInfo.chainAssetType.equals(ChainAssetType.ICRC3)) {
      if (this.feeCache[assetInfo.contractAddress]) {
        return this.feeCache[assetInfo.contractAddress]
      }
      const ledger = this.getIcrcLedger(assetInfo.contractAddress)
      const fee = await ledger.transactionFee({})
      const decimals = assetInfo.decimalPlaces?.value ?? (await this.getIcrcDecimals(ledger))
      const result = new BigNumber(String(fee)).shiftedBy(-decimals)
      this.feeCache[assetInfo.contractAddress] = result
      return result
    }

    throw new Error(`Dfinity: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  }

  public Icrc49CallCanister = async (request: Icrc49CallCanisterRequest): Promise<JsonRpcResponseSuccess<Icrc49CallCanisterResult> | JsonRpcResponseError> => {
    await this.readyPromise
    try {
      const params = request.params
      const response = await this.agent!.call(
        params.canisterId,
        {
          methodName: params.method,
          arg: Buffer.from(params.arg, 'base64'),
          callSync: true,
        }
      )
      if (response.response.status > 202) {
        throw new Error(`ICRC49 call failed with http status ${response.response.status}`)
      }
      return buildJsonRpcResponse(request.id, {
        contentMap: Buffer.from(cbor.encode(response.requestDetails)).toString('base64'),
        certificate: Buffer.from(response.response.body?.certificate!).toString('base64'),
      })
    } catch (e: any) {
      return buildJsonRpcError(request.id, IcrcErrorCode.GenericError, e.message ?? JSON.stringify(e))
    }
  }

  private initWallet = async (phrase: string) => {
    this.identity = Secp256k1KeyIdentity.fromSeedPhrase(phrase)
    this.agent = await createAgent({
      identity: this.identity,
      host: RUNTIME_ICRC_HOST || this.chainInfo.rpcUrls[0],
      fetchRootKey: RUNTIME_ICRC_DEV,
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

  private getIcrcDecimals = async (ledger: IcrcLedgerCanister) => {
    let decimals = 8
    const metaData = await ledger.metadata({})
    for (const entry of metaData) {
      if (entry[0] === IcrcMetadataResponseEntries.DECIMALS) {
        decimals = Number(String((entry[1] as any).Nat))
        break;
      }
    }
    return decimals
  }
}
