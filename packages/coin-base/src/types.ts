import { Transform, Type } from 'class-transformer';
import { WalletSignatureSchema, Ecosystem } from './enums';

export class Chain {
  value: bigint;

  constructor(value: bigint) {
    this.value = value;
  }

  static Bitcoin = new Chain(0n);
  static Ethereum = new Chain(60n);
  static Solana = new Chain(501n);
  static Dfinity = new Chain(223n);
  static Ton = new Chain(607n);
  static Tron = new Chain(195n);
  static Kaspa = new Chain(111111n);

  static fromString(value: string): Chain | null {
    if (!value) {
      return null;
    }
    return new Chain(BigInt(value));
  }

  toString(): string {
    return this.value.toString();
  }

  serialize(): string {
    return this.toString();
  }

  equals(other: Chain): boolean {
    if (!other) {
      return false;
    }
    return this.value === other.value;
  }
}

export class ChainNetwork {
  value: bigint;

  constructor(value: bigint) {
    this.value = value;
  }

  static MainNet = new ChainNetwork(1n);
  static TestNet = new ChainNetwork(0n);

  static BtcMainNet = new ChainNetwork(1n);
  static BtcTestNet = new ChainNetwork(2n);

  static EvmMainNet = new ChainNetwork(0x1n);
  static EvmSepoliaNet = new ChainNetwork(0xaa36a7n);
  static EvmBscNet = new ChainNetwork(0x38n);
  static EvmBscTestNet = new ChainNetwork(97n);
  static EvmBaseNet = new ChainNetwork(8453n);
  static EvmBaseSepoliaNet = new ChainNetwork(84532n);
  static EvmAvalancheNet = new ChainNetwork(43114n);
  static EvmAvalancheFujiNet = new ChainNetwork(43113n);
  static EvmScrollNet = new ChainNetwork(534352n);
  static EvmScrollSepoliaNet = new ChainNetwork(534351n);
  static EvmBitlayerNet = new ChainNetwork(200901n);
  static EvmBitlayerTestNet = new ChainNetwork(200810n);
  static EvmSwanNet = new ChainNetwork(254n);
  static EvmSwanTestNet = new ChainNetwork(20241133n);
  static EvmPantaNet = new ChainNetwork(331n);
  static EvmNeoXNet = new ChainNetwork(47763n);
  static EvmNeoXTestNet = new ChainNetwork(12227332n);
  // Kaia/IGRA networks - commented for future use
  // static EvmKaiaNet = new ChainNetwork(8217n);
  // static EvmKaiaKairosTestNet = new ChainNetwork(1001n);

  static SolanaMainNet = new ChainNetwork(0x3n);
  static SolanaTestNet = new ChainNetwork(0x2n);

  static TonMainNet = new ChainNetwork(1n);
  static TonTestNet = new ChainNetwork(2n);

  static TronMainNet = new ChainNetwork(0x2b6653dcn);
  static TronShastaTestNet = new ChainNetwork(0x94a9059en);
  static TronNileTestNet = new ChainNetwork(0xcd8690dcn);

  static DfinityMainNet = new ChainNetwork(1n);

  static KaspaMainNet = new ChainNetwork(0n);
  static KaspaTestNet = new ChainNetwork(1n);
  static EvmKasplexL2TestNet = new ChainNetwork(0xc655458fn);

  static fromString(value: string): ChainNetwork | null {
    if (!value) {
      return null;
    }
    return new ChainNetwork(BigInt(value));
  }

  toString(): string {
    return this.value.toString();
  }

  serialize(): string {
    return this.toString();
  }

  equals(other: ChainNetwork): boolean {
    if (!other) {
      return false;
    }
    return this.value === other.value;
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
    return new ChainId(Chain.fromString(type)!, ChainNetwork.fromString(network)!);
  }

  toString(): string {
    return `${this.type.toString()}_${this.network.toString()}`;
  }

  serialize(): string {
    return this.toString();
  }

  equals(other: ChainId): boolean {
    if (!other) {
      return false;
    }
    return this.type.equals(other.type) && this.network.equals(other.network);
  }
}

export class ChainAssetType {
  value: bigint;
  name: string;

  constructor(value: bigint) {
    this.value = value;
    switch (value.toString()) {
      case '0':
        this.name = 'Native';
        break;
      case '1':
        this.name = 'NativeGas';
        break;
      case '3':
        this.name = 'ERC20';
        break;
      case '4':
        this.name = 'ERC721';
        break;
      case '5':
        this.name = 'ICP';
        break;
      case '6':
        this.name = 'ICRC3';
        break;
      case '7':
        this.name = 'BRC20';
        break;
      case '8':
        this.name = 'SPL';
        break;
      case '9':
        this.name = 'TRC20';
        break;
      case '10':
        this.name = 'Jetton';
        break;
      case '11':
        this.name = 'KRC20';
        break;
      default:
        this.name = 'Unknown';
        break;
    }
  }

  static Native = new ChainAssetType(0n);
  static NativeGas = new ChainAssetType(1n);
  static ERC20 = new ChainAssetType(3n);
  static ERC721 = new ChainAssetType(4n);
  static ICP = new ChainAssetType(5n);
  static ICRC3 = new ChainAssetType(6n);
  static BRC20 = new ChainAssetType(7n);
  static SPL = new ChainAssetType(8n);
  static TRC20 = new ChainAssetType(9n);
  static Jetton = new ChainAssetType(10n);
  static KRC20 = new ChainAssetType(11n);

  static fromString(value: string): ChainAssetType | null {
    if (!value) {
      return null;
    }
    return new ChainAssetType(BigInt(value));
  }

  toString(): string {
    return this.value.toString();
  }

  serialize(): string {
    return this.toString();
  }

  equals(other: ChainAssetType): boolean {
    if (!other) {
      return false;
    }
    return this.value === other.value;
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

  serialize(): string {
    return this.toString();
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
  @Transform(({ value }) => ChainId.fromString(`${value.type.value}_${value.network.value}`), {
    toClassOnly: true
  })
  chainId!: ChainId;
  name!: string;
  fullName!: string;
  icon!: string;
  nativeAssetSymbol!: string;
  nativeAssetDecimals!: number;
  supportedSignaturesSchemas!: WalletSignatureSchema[];
  explorer!: string;
  rpcUrls!: string[];
  wsRpcUrls?: string[];
  isMainnet!: boolean;
  isNativeGas!: boolean;
  ecosystem!: Ecosystem;
  caseSensitiveAddress?: boolean;
  getServerFormatAddress?: (address: string) => string | null;
  getTxLink?: (txId: string) => string;
  getAddressLink?: (address: string) => string;
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
