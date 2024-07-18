import BigNumber from 'bignumber.js';
import { Transform, Type } from 'class-transformer';
import { WalletSignatureSchema } from './basicEnums';

export class AssetId {
  value: BigNumber;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static fromString(value: string): AssetId | null {
    if (!value) {
      return null;
    }
    return new AssetId(new BigNumber(value));
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other: AssetId): boolean {
    if (!other) {
      return false;
    }
    return this.value.isEqualTo(other.value);
  }
}

export class UserId {
  value: BigNumber;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static fromString(value: string): UserId | null {
    if (!value) {
      return null;
    }
    return new UserId(new BigNumber(value));
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other?: UserId): boolean {
    if (!other) {
      return false;
    }
    return this.value.isEqualTo(other.value);
  }
}

export class Nonce {
  value: BigNumber;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static fromString(value: string): Nonce | null {
    if (!value) {
      return null;
    }
    return new Nonce(new BigNumber(value));
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other: Nonce): boolean {
    if (!other) {
      return false;
    }
    return this.value.isEqualTo(other.value);
  }
}

export class TransactionType {
  value: BigNumber;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static WalletRegister = new TransactionType(new BigNumber(100));
  static Deposit = new TransactionType(new BigNumber(200));
  static Withdraw = new TransactionType(new BigNumber(201));
  static Transfer = new TransactionType(new BigNumber(300));
  static ResetMainSecret = new TransactionType(new BigNumber(400));
  static CreateApiSecret = new TransactionType(new BigNumber(401));
  static DestroyApiSecret = new TransactionType(new BigNumber(402));
  static CreateSpotOrder = new TransactionType(new BigNumber(500));
  static CancelSpotOrder = new TransactionType(new BigNumber(501));
  static AddAmmV2Liquidity = new TransactionType(new BigNumber(600));
  static RemoveAmmV2Liquidity = new TransactionType(new BigNumber(601));
  static RegisterAsset = new TransactionType(new BigNumber(700));
  static UpdateGlobalWithdrawalFeeTo = new TransactionType(new BigNumber(701));
  static UpdateAssetWithdrawalFeeTo = new TransactionType(new BigNumber(702));
  static UpdateChainConfirmationTimes = new TransactionType(new BigNumber(800));
  static RegisterMarket = new TransactionType(new BigNumber(900));
  static UpdateMarketTradingSettings = new TransactionType(new BigNumber(901));
  static UpdateSpotMarketInitialFeeTo = new TransactionType(new BigNumber(902));
  static UpdateMarketFeeTo = new TransactionType(new BigNumber(903));
  static UpdateMarketInitialFee = new TransactionType(new BigNumber(904));
  static UpdateMarketFee = new TransactionType(new BigNumber(905));
  static ClaimSpotMarketTradingFee = new TransactionType(new BigNumber(906));
  static UpdateSpotMarketRoyalty = new TransactionType(new BigNumber(907));
  static ClaimSpotMarketRoyalty = new TransactionType(new BigNumber(908));
  static AssetAccountBinding = new TransactionType(new BigNumber(1000));
  static AssetAccountUnbinding = new TransactionType(new BigNumber(1001));

  static fromString(value: string): TransactionType | null {
    if (!value) {
      return null;
    }
    return new TransactionType(new BigNumber(value));
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other: TransactionType): boolean {
    if (!other) {
      return false;
    }
    return this.value.isEqualTo(other.value);
  }
}

export class Chain {
  value: BigNumber;
  name: string

  constructor(value: BigNumber, name = '') {
    this.value = value;
    this.name = name;
  }

  static Bitcoin = new Chain(new BigNumber(0), 'Bitcoin');
  static Ethereum = new Chain(new BigNumber(60), 'Ethereum');
  static Solana = new Chain(new BigNumber(501), 'Solana');
  static Dfinity = new Chain(new BigNumber(223), 'Dfinity');
  static Ton = new Chain(new BigNumber(607), 'Ton');
  static Tron = new Chain(new BigNumber(195), 'Tron');

  static fromString(value: string): Chain | null {
    if (!value) {
      return null;
    }
    return new Chain(new BigNumber(value));
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other: Chain): boolean {
    if (!other) {
      return false;
    }
    return this.value.isEqualTo(other.value);
  }
}

export class ChainNetwork {
  value: BigNumber;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static MainNet = new ChainNetwork(new BigNumber(1));
  static TestNet = new ChainNetwork(new BigNumber(0));

  static BtcMainNet = new ChainNetwork(new BigNumber(1));
  static BtcTestNet = new ChainNetwork(new BigNumber(2));

  static EvmMainNet = new ChainNetwork(new BigNumber(0x1));
  static EvmSepoliaNet = new ChainNetwork(new BigNumber(0xaa36a7));
  static EvmBscNet = new ChainNetwork(new BigNumber(0x38));
  static EvmBscTestNet = new ChainNetwork(new BigNumber(97));
  static EvmBaseNet = new ChainNetwork(new BigNumber(8453));
  static EvmBaseSepoliaNet = new ChainNetwork(new BigNumber(84532));
  static EvmAvalancheNet = new ChainNetwork(new BigNumber(43114));
  static EvmAvalancheFujiNet = new ChainNetwork(new BigNumber(43113));
  static EvmScrollNet = new ChainNetwork(new BigNumber(534352));
  static EvmScrollSepoliaNet = new ChainNetwork(new BigNumber(534351));
  static EvmBitlayerNet = new ChainNetwork(new BigNumber(200901));
  static EvmBitlayerTestNet = new ChainNetwork(new BigNumber(200810));

  static SolanaMainNet = new ChainNetwork(new BigNumber(0x3));
  static SolanaTestNet = new ChainNetwork(new BigNumber(0x2));

  static TonMainNet = new ChainNetwork(new BigNumber(1));
  static TonTestNet = new ChainNetwork(new BigNumber(2));

  static TronMainNet = new ChainNetwork(new BigNumber(0x2b6653dc));
  static TronShastaTestNet = new ChainNetwork(new BigNumber(0x94a9059e));
  static TronNileTestNet = new ChainNetwork(new BigNumber(0xcd8690dc));

  static DfinityMainNet = new ChainNetwork(new BigNumber(1));

  static fromString(value: string): ChainNetwork | null {
    if (!value) {
      return null;
    }
    return new ChainNetwork(new BigNumber(value));
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other: ChainNetwork): boolean {
    if (!other) {
      return false;
    }
    return this.value.isEqualTo(other.value);
  }
}

export class ChainId {
  type: Chain;
  network: ChainNetwork;

  constructor(type: Chain, network: ChainNetwork) {
    this.type = type;
    this.network = network;
  }

  static fromString(value: string): ChainId | null {
    if (!value) {
      return null;
    }
    const [type, network] = value.split('_');
    return new ChainId(
      Chain.fromString(type)!,
      ChainNetwork.fromString(network)!
    );
  }

  toString(): string {
    return `${this.type.toString()}_${this.network.toString()}`;
  }

  equals(other: ChainId): boolean {
    if (!other) {
      return false;
    }
    return this.type.equals(other.type) && this.network.equals(other.network);
  }
}

export class ChainInfo {
  /**
   * Chain id
   * @type {ChainId} https://github.com/satoshilabs/slips/blob/master/slip-0044.md.
   */
  @Type(() => ChainId)
  @Transform(
    ({ value }) => ChainId.fromString(`${value.type.value}_${value.network.value}`),
    {
      toClassOnly: true
    }
  )
  chainId!: ChainId;
  name!: string;
  fullName!: string;
  icon!: string;
  nativeAssetSymbol!: string;
  nativeAssetDecimals!: number;
  supportedSignaturesSchemas!: WalletSignatureSchema[];
  explorer!: string;
  rpcUrls!: string[];
  caseSensitiveAddress?: boolean;
  getServerFormatAddress?: (address: string) => string | null
  getTxLink?: (txId: string) => string
  getAddressLink?: (address: string) => string
}

export class DecimalPlaces {
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  static fromNumber(value: number): DecimalPlaces {
    return new DecimalPlaces(value);
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other: DecimalPlaces): boolean {
    if (!other) {
      return false;
    }
    return this.value === other.value;
  }
}

export class ChainAssetType {
  value: BigNumber;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static Native = new ChainAssetType(new BigNumber(0));
  static NativeGas = new ChainAssetType(new BigNumber(1));
  static ERC20 = new ChainAssetType(new BigNumber(3));
  static ERC721 = new ChainAssetType(new BigNumber(4));
  static DFT = new ChainAssetType(new BigNumber(5));
  static ICRC1 = new ChainAssetType(new BigNumber(6));
  static BRC20 = new ChainAssetType(new BigNumber(7));
  static SPL = new ChainAssetType(new BigNumber(8));
  static Jetton = new ChainAssetType(new BigNumber(10));

  static fromString(value: string): ChainAssetType | null {
    if (!value) {
      return null;
    }
    return new ChainAssetType(new BigNumber(value));
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other: ChainAssetType): boolean {
    if (!other) {
      return false;
    }
    return this.value.isEqualTo(other.value);
  }
}

export class Ex3Decimal {
  value: BigNumber;
  decimals: number;

  constructor(value: BigNumber, decimals: number) {
    this.value = value;
    this.decimals = decimals;
  }

  static fromString(value: string): Ex3Decimal | null {
    if (!value) {
      return null;
    }
    const strings = value.split('e');
    const decimals = parseInt(strings[1]);
    const bigNumber = new BigNumber(strings[0]);
    return new Ex3Decimal(bigNumber, decimals);
  }

  static zero(decimals: number = 0): Ex3Decimal {
    return new Ex3Decimal(new BigNumber(0), decimals);
  }

  toString(): string {
    return `${this.value.toFixed()}e${this.decimals}`;
  }

  toNumber(): number {
    return this.toBigNumber().toNumber();
  }

  /**
   * convert value into number as a bigNumber format
   */
  toBigNumber(): BigNumber {
    return this.value.shiftedBy(-this.decimals);
  }

  minus(other: Ex3Decimal): Ex3Decimal {
    return new Ex3Decimal(this.value.minus(other.value), this.decimals);
  }

  eq(other: Ex3Decimal): boolean {
    return this.value.eq(other.value) && this.decimals === other.decimals;
  }
}

export class Ex3Price {
  value: BigNumber;

  static decimals = 32;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static fromString(value: string): Ex3Price | null {
    if (!value) {
      return null;
    }
    const bigNumber = new BigNumber(value);
    return new Ex3Price(bigNumber);
  }

  toString(): string {
    return this.value.toString();
  }

  /**
   * convert value into number as a bigNumber format
   */
  toBigNumber(): BigNumber {
    return this.value.shiftedBy(-Ex3Price.decimals);
  }

  toNumber(): number {
    return this.toBigNumber().toNumber();
  }
}
