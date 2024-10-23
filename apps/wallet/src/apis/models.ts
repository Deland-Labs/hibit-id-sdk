import BigNumber from 'bignumber.js';
import { cborIndex } from '../utils/encoder';
import { Transform, Type } from 'class-transformer';
import {
  AssetId,
  Chain,
  ChainAssetType,
  ChainNetwork,
  DecimalPlaces,
  Ex3Decimal,
  Ex3Price,
  Nonce,
  UserId
} from '../utils/basicTypes';
import { SignaturesSchema } from '../utils/basicEnums';

export type Ex3BigInteger = BigNumber;
export type TradingId = string;
export type DepthIndex = number;

export interface Ex3Response<T> {
  isSuccess: boolean;
  message: string;
  value: T;
}

export class Ex3ChainId {
  @cborIndex(0)
  public chain!: Chain;
  @cborIndex(1)
  public chainNetwork!: ChainNetwork;

  public constructor(init?: Partial<Ex3ChainId>) {
    Object.assign(this, init);
  }
}

export class CryptoAsset {
  @cborIndex(0)
  public chainId!: Ex3ChainId;
  @cborIndex(1)
  public chainAssetType!: ChainAssetType;
  @cborIndex(2)
  public contractAddress!: string;

  public constructor(init?: Partial<CryptoAsset>) {
    Object.assign(this, init);
  }
}

export class EmptyRequestResult {
}

export class NonceResult {
  @Type(() => Nonce)
  @Transform(({ value }) => Nonce.fromString(value), { toClassOnly: true })
  nonce!: Nonce;
}

export class AssetBalanceMap {
  private map: Map<string, Ex3Decimal> = new Map();

  constructor(_map: Map<AssetId, Ex3Decimal>) {
    if (!_map) return;
    _map.forEach((value, key) => {
      this.map.set(key.toString(), value);
    });
  }

  isEmpty(): boolean {
    return this.map.size === 0;
  }

  has(assetId: AssetId): boolean {
    return this.map.has(assetId.toString());
  }

  get(assetId: AssetId): Ex3Decimal | null {
    return this.map.get(assetId.toString()) ?? null;
  }

  set(assetId: AssetId, value: Ex3Decimal) {
    this.map.set(assetId.toString(), value);
  }

  delete(assetId: AssetId) {
    return this.map.delete(assetId.toString());
  }
}

export class AssetPriceMap {
  private map: Map<string, Ex3Price> = new Map();

  constructor(_map: Map<AssetId, Ex3Price>) {
    if (!_map) return;
    _map.forEach((value, key) => {
      this.map.set(key.toString(), value);
    });
  }

  isEmpty(): boolean {
    return this.map.size === 0;
  }

  has(assetId: AssetId): boolean {
    return this.map.has(assetId.toString());
  }

  get(assetId: AssetId): Ex3Price | null {
    return this.map.get(assetId.toString()) ?? null;
  }

  set(assetId: AssetId, value: Ex3Price) {
    this.map.set(assetId.toString(), value);
  }

  delete(assetId: AssetId) {
    return this.map.delete(assetId.toString());
  }
}

export class GetUserAssetsResult {
  @Type(() => AssetBalanceMap)
  @Transform(({ value }) => {
    const newMap = new Map<AssetId, Ex3Decimal>();
    for (const key of Object.keys(value)) {
      newMap.set(
        AssetId.fromString(key.toString())!,
        Ex3Decimal.fromString(value[key].toString())!
      );
    }
    return new AssetBalanceMap(newMap);
  })
  assets!: AssetBalanceMap;
}

export type ChainAddress = string;

export class WalletRegistrationResult {
  walletId!: string;
}

export class RegisterWalletFlowResult {
  @Type(() => WalletInfo)
  walletInfo!: WalletInfo;
}

export interface Ex3KeyPair {
  privateKeyHex: string;
  publicKeyHex: string;
  schema: SignaturesSchema;
}

export class Ex3KeyResult {
  ex3KeyPair!: Ex3KeyPair;
  @Type(() => UserId)
  @Transform(({ value }) => UserId.fromString(value), { toClassOnly: true })
  userId!: UserId;
}

export interface GetWalletInfoInput {
  chain: Chain;
  publicKey?: string;
  address: ChainAddress;
}

export interface RegisterWalletFlowInput {
  chain: Chain;
  publicKey?: string;
}

export class WalletInfo {
  @Type(() => UserId)
  @Transform(({ value }) => UserId.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  userId?: UserId;
}

export class RootAssetInfo {
  @Type(() => AssetId)
  @Transform(({ value }) => AssetId.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  assetId!: AssetId;
  @Type(() => Chain)
  @Transform(({ value }) => Chain.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chain!: Chain;
  @Type(() => ChainNetwork)
  @Transform(({ value }) => ChainNetwork.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chainNetwork!: ChainNetwork;
  @Type(() => ChainAssetType)
  @Transform(({ value }) => ChainAssetType.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chainAssetType!: ChainAssetType;
  contractAddress!: ChainAddress;
  @Type(() => DecimalPlaces)
  @Transform(({ value }) => DecimalPlaces.fromNumber(value) ?? undefined, {
    toClassOnly: true
  })
  decimalPlaces!: DecimalPlaces;
  orderNo!: number;
  isBaseToken!: boolean;
  icon?: string;
  displayName!: string;
  assetSymbol!: string;
  @Type(() => SubAssetInfo)
  subAssets!: SubAssetInfo[];
}

export class SubAssetInfo {
  @Type(() => AssetId)
  @Transform(({ value }) => AssetId.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  assetId!: AssetId;
  @Type(() => Chain)
  @Transform(({ value }) => Chain.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chain!: Chain;
  @Type(() => ChainNetwork)
  @Transform(({ value }) => ChainNetwork.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chainNetwork!: ChainNetwork;
  @Type(() => ChainAssetType)
  @Transform(({ value }) => ChainAssetType.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chainAssetType!: ChainAssetType;
  contractAddress!: ChainAddress;
  @Type(() => DecimalPlaces)
  @Transform(({ value }) => DecimalPlaces.fromNumber(value) ?? undefined, {
    toClassOnly: true
  })
  decimalPlaces!: DecimalPlaces;
  orderNo!: number;
}

export class ChainData {
  @Type(() => Chain)
  @Transform(({ value }) => Chain.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chain!: Chain;
  @Type(() => ChainNetwork)
  @Transform(({ value }) => ChainNetwork.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chainNetwork!: ChainNetwork;
  depositAddress?: ChainAddress;
  icon?: string;
  displayName!: string;
  orderNo!: number;
}

export class SystemBalanceResult {
  @Type(() => AssetBalanceMap)
  @Transform(({ value }) => {
    const newMap = new Map<AssetId, Ex3Decimal>();
    for (const key of Object.keys(value)) {
      newMap.set(
        AssetId.fromString(key.toString())!,
        Ex3Decimal.fromString(value[key].toString())!
      );
    }
    return new AssetBalanceMap(newMap);
  })
  assets!: AssetBalanceMap;
}

export class GetAssetPriceResult {
  @Type(() => AssetPriceMap)
  @Transform(({ value }) => {
    const newMap = new Map<AssetId, Ex3Price>();
    for (const key of Object.keys(value)) {
      newMap.set(
        AssetId.fromString(key.toString())!,
        Ex3Price.fromString(value[key].toString())!
      );
    }
    return new AssetPriceMap(newMap);
  })
  assets!: AssetPriceMap;
}

export class GetTokenInfoInput {
  address!: string;

  public constructor(init?: Partial<GetTokenInfoInput>) {
    Object.assign(this, init);
  }
}

export class GetTokenInfoResult {
  @Type(() => Chain)
  @Transform(({ value }) => Chain.fromString(value), { toClassOnly: true })
  chainType!: Chain;
  @Type(() => ChainNetwork)
  @Transform(({ value }) => ChainNetwork.fromString(value), {
    toClassOnly: true
  })
  chainNetwork!: ChainNetwork;
  @Type(() => ChainAssetType)
  @Transform(({ value }) => ChainAssetType.fromString(value) ?? undefined, {
    toClassOnly: true
  })
  chainAssetType!: ChainAssetType;
  address!: string;
  name!: string;
  symbol!: string;
  decimals!: number;
  icon!: string;
}

export class GetBrc20BalanceInput {
  chainAddress!: string;
  tick!: string;
  chainNetwork!: ChainNetwork;

  public constructor(init?: Partial<GetBrc20BalanceInput>) {
    Object.assign(this, init);
  }
}

export class GetBrc20BalanceResult {
  @Type(() => Chain)
  @Transform(({ value }) => Chain.fromString(value), { toClassOnly: true })
  chain!: Chain;
  @Type(() => ChainNetwork)
  @Transform(({ value }) => ChainNetwork.fromString(value), {
    toClassOnly: true
  })
  chainNetwork!: ChainNetwork;
  address!: string;
  tick!: string;
  @Type(() => Ex3Decimal)
  @Transform(({ value }) => Ex3Decimal.fromString(value), { toClassOnly: true })
  balance!: Ex3Decimal;
}

export interface AuthServerErrorResponse {
  error: {
    code: any
    message: string
    details: any
    data: any
    validationErrors: any
  };
}


export class CreateMnemonicInput {
  aesKey!: string;
  mnemonicContent!: string;
  version!: number;  // 0 means no encryption

  public constructor(init?: Partial<CreateMnemonicInput>) {
    Object.assign(this, init);
  }
}

export class GetMnemonicInput {
  publicKey!: string;

  public constructor(init?: Partial<GetMnemonicInput>) {
    Object.assign(this, init);
  }
}

export class GetMnemonicResult {
  id!: string; // mnemonic id
  userId!: string; // user id
  mnemonicContent!: string; // phrase
  version!: number; // whether mnemonicContent is encrypted, 0 means no encryption
  aesKey!: string; // aes key to decrypt mnemonicContent when version > 0
  createdAt!: string;
  updatedAt!: string;

  public constructor(init?: Partial<GetMnemonicResult>) {
    Object.assign(this, init);
  }
}

export class GetPublicKeyResult {
  publicKeyBase64!: string;
}

export class UpdateMnemonicInput {
  newAesKey!: string;
  oldMnemonicContent!: string;
  oldVersion!: number;
  oldAesKey!: string;
  newMnemonicContent!: string;
  newVersion!: number;

  public constructor(init?: Partial<UpdateMnemonicInput>) {
    Object.assign(this, init);
  }
}

export class UpdateMnemonicResult extends GetMnemonicResult {
}

export class GetUserLoginsResultItem {
  providerKey!: string
  loginProvider!: string
  providerDisplayName!: string
}

export type GetUserLoginsResult = GetUserLoginsResultItem[]
