import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer/';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { createAgent } from '@dfinity/utils';
import { HttpAgent, v3ResponseBody } from '@dfinity/agent';
import { AccountIdentifier, LedgerCanister } from '@dfinity/ledger-icp';
import { IcrcLedgerCanister, IcrcMetadataResponseEntries } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import {
  Icrc25SupportedStandardsResult,
  Icrc49CallCanisterRequest,
  Icrc49CallCanisterResult,
  IcrcErrorCode,
  JsonRpcResponseError,
  JsonRpcResponseSuccess
} from './types';
import { buildJsonRpcError, buildJsonRpcResponse } from './utils';
import * as cbor from 'cborg';
import ic from 'ic0';
import { AssetInfo, BaseChainWallet, ChainInfo, getEcdsaDerivedPrivateKey, WalletAccount } from '@delandlabs/coin-base';
import { FT_ASSET, NATIVE_ASSET, CHAIN_NAME, CHAIN, DERIVING_PATH } from './defaults';
import { base } from '@delandlabs/crypto-lib';

const ICP_LEDGER_CANISTER_ID = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

export class DfinityChainWallet extends BaseChainWallet {
  private identity: Secp256k1KeyIdentity | null = null;
  private agent: HttpAgent | null = null;
  private readyPromise: Promise<void>;
  private feeCache: Record<string | 'native', BigNumber> = {};

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
    const address = this.identity!.getPrincipal().toString();
    return {
      address,
      publicKey: Buffer.from(this.identity!.getPublicKey().toRaw()).toString('hex')
    } as WalletAccount;
  };

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    if (!message) {
      throw new Error(`${CHAIN_NAME}: Missing sign data`);
    }
    await this.readyPromise;
    const signature = await this.identity!.sign(Buffer.from(message, 'utf8'));
    return Buffer.from(signature).toString('hex');
  };

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }

    await this.readyPromise;
    // ICP
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const ledger = this.getIcpLedger();
      const balance = await ledger.accountBalance({
        accountIdentifier: AccountIdentifier.fromPrincipal({
          principal: Principal.fromText(address)
        })
      });
      return new BigNumber(String(balance)).shiftedBy(-assetInfo.decimalPlaces.value);
    }
    // ICRC
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      await this.assertIcrc3Support(assetInfo.contractAddress);
      const ledger = this.getIcrcLedger(assetInfo.contractAddress);
      const balance = await ledger.balance({
        owner: Principal.fromText(address)
      });
      const decimals = assetInfo.decimalPlaces?.value ?? (await this.getIcrcDecimals(ledger));
      return new BigNumber(String(balance)).shiftedBy(-decimals);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    await this.readyPromise;

    // ICP
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      const ledger = this.getIcpLedger();
      const blockHeight = await ledger.transfer({
        to: AccountIdentifier.fromPrincipal({
          principal: Principal.fromText(toAddress)
        }),
        amount: BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toFixed(0, BigNumber.ROUND_FLOOR))
      });
      console.debug(`${CHAIN_NAME}: ICP transfer blockHeight ${blockHeight}`);
      return String(blockHeight);
    }
    // ICRC
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      await this.assertIcrc3Support(assetInfo.contractAddress);
      const ledger = this.getIcrcLedger(assetInfo.contractAddress);
      const decimals = assetInfo.decimalPlaces?.value ?? (await this.getIcrcDecimals(ledger));
      const blockIndex = await ledger.transfer({
        to: {
          owner: Principal.fromText(toAddress),
          subaccount: []
        },
        amount: BigInt(amount.shiftedBy(decimals).toFixed(0, BigNumber.ROUND_FLOOR))
      });
      console.debug(`${CHAIN_NAME}: ICRC transfer blockIndex ${blockIndex}`);
      return String(blockIndex);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override getEstimatedFee = async (
    _toAddress: string,
    _amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<BigNumber> => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    await this.readyPromise;

    // ICP
    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      if (this.feeCache['native']) {
        return this.feeCache['native'];
      }
      const ledger = this.getIcpLedger();
      const fee = await ledger.transactionFee();
      const result = new BigNumber(String(fee)).shiftedBy(-assetInfo.decimalPlaces.value);
      this.feeCache['native'] = result;
      return result;
    }

    // ICRC
    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      if (this.feeCache[assetInfo.contractAddress]) {
        return this.feeCache[assetInfo.contractAddress];
      }
      await this.assertIcrc3Support(assetInfo.contractAddress);
      const ledger = this.getIcrcLedger(assetInfo.contractAddress);
      const fee = await ledger.transactionFee({});
      const decimals = assetInfo.decimalPlaces?.value ?? (await this.getIcrcDecimals(ledger));
      const result = new BigNumber(String(fee)).shiftedBy(-decimals);
      this.feeCache[assetInfo.contractAddress] = result;
      return result;
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public Icrc49CallCanister = async (
    request: Icrc49CallCanisterRequest
  ): Promise<JsonRpcResponseSuccess<Icrc49CallCanisterResult> | JsonRpcResponseError> => {
    await this.readyPromise;
    try {
      const params = request.params;
      const response = await this.agent!.call(params.canisterId, {
        methodName: params.method,
        arg: Buffer.from(params.arg, 'base64'),
        callSync: true
      });
      if (response.response.status > 202) {
        throw new Error(`ICRC49 call failed with http status ${response.response.status}`);
      }
      return buildJsonRpcResponse(request.id, {
        contentMap: Buffer.from(cbor.encode(response.requestDetails)).toString('base64'),
        certificate: Buffer.from((response.response.body as v3ResponseBody)?.certificate!).toString('base64')
      });
    } catch (e: any) {
      return buildJsonRpcError(request.id, IcrcErrorCode.GenericError, e.message ?? JSON.stringify(e));
    }
  };

  private initWallet = async (phrase: string) => {
    const privateKeyHex = await getEcdsaDerivedPrivateKey(phrase, DERIVING_PATH);
    const privateKeyBytes = base.fromHex(privateKeyHex);
    this.identity = Secp256k1KeyIdentity.fromSecretKey(privateKeyBytes);
    // this.agent = await createAgent({
    //   identity: this.identity,
    //   host: RUNTIME_ICRC_HOST || this.chainInfo.rpcUrls[0],
    //   fetchRootKey: RUNTIME_ICRC_DEV,
    // })
    this.agent = await createAgent({
      identity: this.identity,
      host: this.chainInfo.rpcUrls[0]
    });
  };

  private getIcpLedger = () => {
    return LedgerCanister.create({
      agent: this.agent!,
      canisterId: ICP_LEDGER_CANISTER_ID
    });
  };

  private getIcrcLedger = (canisterId: string) => {
    return IcrcLedgerCanister.create({
      agent: this.agent!,
      canisterId: Principal.fromText(canisterId)
    });
  };

  private getIcrcDecimals = async (ledger: IcrcLedgerCanister) => {
    let decimals = 8;
    const metaData = await ledger.metadata({});
    for (const entry of metaData) {
      if (entry[0] === IcrcMetadataResponseEntries.DECIMALS) {
        decimals = Number(String((entry[1] as any).Nat));
        break;
      }
    }
    return decimals;
  };

  private assertIcrc3Support = async (canisterId: string) => {
    try {
      const ledger = ic(canisterId);
      const response: Icrc25SupportedStandardsResult['supportedStandards'] =
        await ledger.call('icrc1_supported_standards');

      console.debug('icrc1_supported_standards', canisterId, response);
      if (!Array.isArray(response) || !response.find((standard) => standard?.name.toUpperCase() === 'ICRC-3')) {
        throw new Error(`${CHAIN_NAME}: token(${canisterId}) does not support ICRC-3`);
      }
    } catch (e) {
      throw new Error(`${CHAIN_NAME}: failed to check ICRC-3 support of token(${canisterId})`);
    }
  };
}
