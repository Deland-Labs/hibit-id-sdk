import { base, signUtil } from "@okxweb3/crypto-lib";
import { Address, AddressVersion } from "./Address";
import { NetworkType, NetworkTypeHelper } from "./Network.ts";

// const TransactionSigningHashKey = Buffer.from("TransactionSigningHash");
// const TransactionIDKey = Buffer.from("TransactionID");
const PersonalMessageSigningHashKey = Buffer.from("PersonalMessageSigningHash");

class Keypair {
  public privateKey?: string; // hex string
  public publicKey?: string;
  public xOnlyPublicKey?: string;

  constructor(
    privateKey?: string,
    publicKey?: string,
    xOnlyPublicKey?: string
  ) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.xOnlyPublicKey = xOnlyPublicKey;
  }

  public toAddress(network: NetworkType): Address {
    if (!this.xOnlyPublicKey) {
      throw new Error(
        "X-only public key is not available for address generation"
      );
    }
    const payload = base.fromHex(this.xOnlyPublicKey!);
    return new Address(
      NetworkTypeHelper.toAddressPrefix(network),
      AddressVersion.PubKey,
      payload
    );
  }

  public toAddressECDSA(network: NetworkType): Address {
    if (!this.publicKey) {
      throw new Error(
        "Ecdsa public key is not available for ECDSA address generation"
      );
    }
    const payload = base.fromHex(this.publicKey!);
    return new Address(
      NetworkTypeHelper.toAddressPrefix(network),
      AddressVersion.PubKeyECDSA,
      payload
    );
  }

  public static fromPrivateKeyHex(key: string): Keypair {
    return new Keypair(
      key,
      base.toHex(signUtil.secp256k1.publicKeyCreate(base.fromHex(key), true)),
      base.toHex(
        signUtil.schnorr.secp256k1.schnorr.getPublicKey(base.fromHex(key))
      )
    );
  }

  public static fromPublicKeyHex(pubKey: string): Keypair {
    // Extract the x-coordinate from the public key
    const x = signUtil.schnorr.secp256k1.schnorr.utils.bytesToNumberBE(
      base.fromHex(pubKey).slice(1, 33)
    );
    // Convert the x-coordinate to an elliptic curve point
    const p = signUtil.schnorr.secp256k1.schnorr.utils.lift_x(x);
    // The x-only public key is the x-coordinate of the point
    const xOnlyPubKey = p.toRawBytes(true).slice(1);
    return new Keypair(undefined, pubKey, base.toHex(xOnlyPubKey));
  }

  public static fromXOnlyPublicKeyHex(xOnlyPublicKeyHex: string): Keypair {
    return new Keypair(undefined, undefined, xOnlyPublicKeyHex);
  }

  public signMessageWithAuxData(
    message: Uint8Array,
    auxData32: Uint8Array
  ): Uint8Array {
    if (!this.privateKey) {
      throw new Error("Secret key is not available for signing");
    }

    const hash = base.blake2(
      Buffer.from(message),
      256,
      PersonalMessageSigningHashKey
    );
    return signUtil.schnorr.secp256k1.schnorr.sign(
      hash,
      base.toHex(base.fromHex(this.privateKey)),
      auxData32
    );
  }

  public verifyMessage(signature: Uint8Array, message: Uint8Array): boolean {
    const hashedMsg = base.blake2(
      Buffer.from(message),
      256,
      PersonalMessageSigningHashKey
    );
    return signUtil.schnorr.secp256k1.schnorr.verify(
      signature,
      hashedMsg,
      this.xOnlyPublicKey!
    );
  }
}

export { Keypair };
