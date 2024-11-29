import {AddressPrefix, AddressPrefixHelper} from "./Prefix";
import {AddressVersion, AddressVersionHelper} from "./Version";

const Charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    .split("")
    .map((c) => c.charCodeAt(0));

const RevCharset = [
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
    100, 100, 100, 15, 100, 10, 17, 21, 20, 26, 30, 7, 5, 100, 100, 100, 100, 100,
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
    100, 100, 100, 100, 29, 100, 24, 13, 25, 9, 8, 23, 100, 18, 22, 31, 27, 19,
    100, 1, 0, 3, 16, 11, 28, 12, 14, 6, 4, 2,
];

class Address {
    public Prefix: AddressPrefix;
    public Version: AddressVersion;
    public Payload: Uint8Array;

    constructor(
        prefix: AddressPrefix,
        version: AddressVersion,
        payload: Uint8Array
    ) {
        if (!AddressPrefixHelper.isTest(prefix)) {
            if (payload.length !== AddressVersionHelper.publicKeyLen(version)) {
                throw new Error("Invalid payload length for the given version.");
            }
        }

        this.Prefix = prefix;
        this.Version = version;
        this.Payload = payload;
    }

    public static fromString(addressStr: string): Address {
        const parts = addressStr.split(":");
        if (parts.length !== 2) {
            throw new Error("Invalid address format");
        }

        return Address.decodePayload(AddressPrefixHelper.parse(parts[0]), parts[1]);
    }

    public static validate(addressStr: string): boolean {
        try {
            Address.fromString(addressStr);
            return true;
        } catch {
            return false;
        }
    }

    public versionToString(): string {
        return this.Version.toString();
    }

    public prefixToString(): string {
        return this.Prefix;
    }

    public setPrefixFromStr(prefixStr: string): void {
        this.Prefix = AddressPrefixHelper.parse(prefixStr);
    }

    public payloadToString(): string {
        return this.encodePayload();
    }

    public short(n: number): string {
        const payload = this.encodePayload();
        n = Math.min(n, payload.length / 4);
        return `${this.Prefix}:${payload.substring(0, n)}....${payload.substring(payload.length - n)}`;
    }

    public equals(other: Address | null): boolean {
        if (other === null) {
            return false;
        }

        return (
            this.Prefix === other.Prefix &&
            this.Version === other.Version &&
            this.Payload.every((value, index) => value === other.Payload[index])
        );
    }

    public toString(): string {
        return `${this.prefixToString()}:${this.encodePayload()}`;
    }

    private encodePayload(): string {
        const fiveBitPayload = Address.conv8to5(
            new Uint8Array([this.Version, ...this.Payload])
        );
        const fiveBitPrefix = Array.from(this.Prefix).map(
            (c) => c.charCodeAt(0) & 0x1f
        );
        const checksum = Address.checksum(fiveBitPayload, fiveBitPrefix);
        const checksumBytes = new ArrayBuffer(8);
        const view = new DataView(checksumBytes);
        view.setBigUint64(0, checksum, false);

        const combined = new Uint8Array([
            ...fiveBitPayload,
            ...Address.conv8to5(new Uint8Array(checksumBytes.slice(3))),
        ]);

        const bytes = Array.from(combined).map((c) => Charset[c]);
        return String.fromCharCode(...bytes);
    }

    private static decodePayload(
        prefix: AddressPrefix,
        address: string
    ): Address {
        const addressU5 = Array.from(address).map(
            (c) => {
                const index = c.charCodeAt(0);
                if (index >= RevCharset.length) {
                    throw new Error(`Character code ${index} is out of bounds`);
                }
                return RevCharset[index];
            }
        );
        if (address.length < 8) {
            throw new Error("Bad payload");
        }

        const payloadU5 = new Uint8Array(addressU5.slice(0, address.length - 8));
        const checksumU5 = new Uint8Array(addressU5.slice(address.length - 8));
        const fiveBitPrefix = Array.from(prefix).map((c) => c.charCodeAt(0) & 0x1f);
        const checksumBytes = new Uint8Array([
            0,
            0,
            0,
            ...Address.conv5to8(new Uint8Array(checksumU5)),
        ]);
        const checksum = new DataView(checksumBytes.buffer).getBigUint64(0, false);

        if (Address.checksum(payloadU5, fiveBitPrefix) !== checksum) {
            throw new Error("Bad checksum");
        }

        const payloadU8 = Address.conv5to8(payloadU5);
        return new Address(
            prefix,
            payloadU8[0] as AddressVersion,
            payloadU8.slice(1)
        );
    }

    private static polymod(values: Uint8Array): bigint {
        let c = 1n;
        for (const d of values) {
            const c0 = c >> 35n;
            c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
            if ((c0 & 0x01n) !== 0n) c ^= 0x98f2bc8e61n;
            if ((c0 & 0x02n) !== 0n) c ^= 0x79b76d99e2n;
            if ((c0 & 0x04n) !== 0n) c ^= 0xf33e5fb3c4n;
            if ((c0 & 0x08n) !== 0n) c ^= 0xae2eabe2a8n;
            if ((c0 & 0x10n) !== 0n) c ^= 0x1e4f43e470n;
        }

        return c ^ 1n;
    }

    private static checksum(payload: Uint8Array, prefix: number[]): bigint {
        return Address.polymod(
            new Uint8Array([...prefix, 0, ...payload, ...new Uint8Array(8)])
        );
    }

    private static conv8to5(payload: Uint8Array): Uint8Array {
        const fiveBit = [];
        let buff = 0,
            bits = 0;
        for (const c of payload) {
            buff = (buff << 8) | c;
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                fiveBit.push((buff >> bits) & 0x1f);
                buff &= (1 << bits) - 1;
            }
        }

        if (bits > 0) {
            fiveBit.push((buff << (5 - bits)) & 0x1f);
        }
        return new Uint8Array(fiveBit);
    }

    private static conv5to8(payload: Uint8Array): Uint8Array {
        const eightBit = [];
        let buff = 0,
            bits = 0;
        for (const c of payload) {
            buff = (buff << 5) | c;
            bits += 5;
            while (bits >= 8) {
                bits -= 8;
                eightBit.push((buff >> bits) & 0xff);
                buff &= (1 << bits) - 1;
            }
        }

        return new Uint8Array(eightBit);
    }
}

export {
    Address,
    AddressPrefix,
    AddressPrefixHelper,
    AddressVersion,
    AddressVersionHelper,
};
