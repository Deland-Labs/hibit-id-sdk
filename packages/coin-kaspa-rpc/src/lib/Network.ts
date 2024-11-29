import {AddressPrefix} from "./Address";

enum NetworkType {
    Mainnet,
    Testnet,
    Devnet,
    Simnet
}

class NetworkId {
    public networkType: NetworkType;
    public suffix?: number;

    constructor(networkType: NetworkType, suffix?: number) {
        if (networkType === NetworkType.Testnet && suffix === undefined) {
            throw new Error("Network suffix required for testnet");
        }

        this.networkType = networkType;
        this.suffix = suffix;
    }

    public static new(networkType: NetworkType): NetworkId {
        return new NetworkId(networkType);
    }

    public static withSuffix(networkType: NetworkType, suffix: number): NetworkId {
        return new NetworkId(networkType, suffix);
    }

    public isMainnet(): boolean {
        return this.networkType === NetworkType.Mainnet;
    }

    public defaultP2PPort(): number {
        switch (this.networkType) {
            case NetworkType.Mainnet:
                return 16111;
            case NetworkType.Testnet:
                switch (this.suffix) {
                    case 10:
                        return 16211;
                    case 11:
                        return 16311;
                    default:
                        return 16411;
                }
            case NetworkType.Simnet:
                return 16511;
            case NetworkType.Devnet:
                return 16611;
            default:
                throw new Error("Unknown network type");
        }
    }

    public toString(): string {
        return this.suffix !== undefined ? `${NetworkType[this.networkType].toLowerCase()}-${this.suffix}` : NetworkType[this.networkType].toLowerCase();
    }

    public static fromString(networkName: string): NetworkId {
        const parts = networkName.split('-');
        const networkType = NetworkType[parts[0] as keyof typeof NetworkType];
        const suffix = parts.length > 1 ? parseInt(parts[1]) : undefined;

        return new NetworkId(networkType, suffix);
    }

    public static iter(): NetworkId[] {
        return [
            NetworkId.new(NetworkType.Mainnet),
            NetworkId.withSuffix(NetworkType.Testnet, 10),
            NetworkId.withSuffix(NetworkType.Testnet, 11),
            NetworkId.new(NetworkType.Devnet),
            NetworkId.new(NetworkType.Simnet)
        ];
    }

    public equals(other: NetworkId): boolean {
        return this.networkType === other.networkType && this.suffix === other.suffix;
    }
}

class NetworkTypeHelper {
    public static toAddressPrefix(networkType: NetworkType): AddressPrefix {
        switch (networkType) {
            case NetworkType.Mainnet:
                return AddressPrefix.Mainnet;
            case NetworkType.Testnet:
                return AddressPrefix.Testnet;
            case NetworkType.Simnet:
                return AddressPrefix.Simnet;
            case NetworkType.Devnet:
                return AddressPrefix.Devnet;
            default:
                throw new Error(`Unknown network type: ${networkType}`);
        }
    }
}

export {
    NetworkId, NetworkType, NetworkTypeHelper
}
    ;