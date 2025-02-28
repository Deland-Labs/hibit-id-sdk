import BigNumber from "bignumber.js";
import { Transform, Type } from 'class-transformer';
import { WalletSignatureSchema, Ecosystem } from "./enums";

export class Chain {
  value: BigNumber;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static Bitcoin = new Chain(new BigNumber(0));
  static Ethereum = new Chain(new BigNumber(60));
  static Solana = new Chain(new BigNumber(501));
  static Dfinity = new Chain(new BigNumber(223));
  static Ton = new Chain(new BigNumber(607));
  static Tron = new Chain(new BigNumber(195));
  static Kaspa = new Chain(new BigNumber(111111));

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
  static EvmSwanNet = new ChainNetwork(new BigNumber(254));
  static EvmSwanTestNet = new ChainNetwork(new BigNumber(20241133));
  static EvmPantaNet = new ChainNetwork(new BigNumber(331));
  static EvmNeoXNet = new ChainNetwork(new BigNumber(47763));
  static EvmNeoXTestNet = new ChainNetwork(new BigNumber(12227332));

  static SolanaMainNet = new ChainNetwork(new BigNumber(0x3));
  static SolanaTestNet = new ChainNetwork(new BigNumber(0x2));

  static TonMainNet = new ChainNetwork(new BigNumber(1));
  static TonTestNet = new ChainNetwork(new BigNumber(2));

  static TronMainNet = new ChainNetwork(new BigNumber(0x2b6653dc));
  static TronShastaTestNet = new ChainNetwork(new BigNumber(0x94a9059e));
  static TronNileTestNet = new ChainNetwork(new BigNumber(0xcd8690dc));

  static DfinityMainNet = new ChainNetwork(new BigNumber(1));

  static KaspaMainNet = new ChainNetwork(new BigNumber(0));
  static KaspaTestNet = new ChainNetwork(new BigNumber(1));

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

export class ChainAssetType {
  value: BigNumber;

  constructor(value: BigNumber) {
    this.value = value;
  }

  static Native = new ChainAssetType(new BigNumber(0));
  static NativeGas = new ChainAssetType(new BigNumber(1));
  static ERC20 = new ChainAssetType(new BigNumber(3));
  static ERC721 = new ChainAssetType(new BigNumber(4));
  static ICP = new ChainAssetType(new BigNumber(5));
  static ICRC3 = new ChainAssetType(new BigNumber(6));
  static BRC20 = new ChainAssetType(new BigNumber(7));
  static SPL = new ChainAssetType(new BigNumber(8));
  static TRC20 = new ChainAssetType(new BigNumber(9));
  static Jetton = new ChainAssetType(new BigNumber(10));
  static KRC20 = new ChainAssetType(new BigNumber(11));

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
  isMainnet!: boolean
  isNativeGas!: boolean;
  ecosystem!: Ecosystem;
  caseSensitiveAddress?: boolean;
  getServerFormatAddress?: (address: string) => string | null
  getTxLink?: (txId: string) => string
  getAddressLink?: (address: string) => string
}

export class AssetInfo {
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
  contractAddress!: string;
  @Type(() => DecimalPlaces)
  @Transform(({ value }) => DecimalPlaces.fromNumber(value) ?? undefined, {
    toClassOnly: true
  })
  decimalPlaces!: DecimalPlaces;
}

export interface WalletAccount {
  address: string;
  publicKey?: string;
}
