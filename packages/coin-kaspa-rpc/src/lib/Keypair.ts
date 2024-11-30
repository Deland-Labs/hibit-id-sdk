import { base, signUtil } from '@delandlabs/crypto-lib';
import { Address, AddressVersion } from './Address';
import { NetworkType, NetworkTypeHelper } from './Network.ts';

// const TransactionSigningHashKey = Buffer.from("TransactionSigningHash");
// const TransactionIDKey = Buffer.from("TransactionID");
const PersonalMessageSigningHashKey = Buffer.from('PersonalMessageSigningHash');

/**
 * Represents a keypair with methods for address generation and message signing.
 */
class Keypair {
  public readonly privateKey?: string; // hex string
  public readonly publicKey?: string;
  public readonly xOnlyPublicKey?: string;

  /**
   * Constructs a Keypair instance.
   * @param privateKey - The private key as a hex string.
   * @param publicKey - The public key as a hex string.
   * @param xOnlyPublicKey - The x-only public key as a hex string.
   */
  private constructor(
    privateKey?: string,
    publicKey?: string,
    xOnlyPublicKey?: string
  ) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.xOnlyPublicKey = xOnlyPublicKey;
  }

  /**
   * Generates an address from the x-only public key.
   * @param network - The network type.
   * @returns The generated address.
   * @throws If the x-only public key is not available.
   */
  public toAddress(network: NetworkType): Address {
    if (!this.xOnlyPublicKey) {
      throw new Error(
        'X-only public key is not available for address generation'
      );
    }
    const payload = base.fromHex(this.xOnlyPublicKey!);
    return new Address(
      NetworkTypeHelper.toAddressPrefix(network),
      AddressVersion.PubKey,
      payload
    );
  }

  /**
   * Generates an ECDSA address from the public key.
   * @param network - The network type.
   * @returns The generated ECDSA address.
   * @throws If the public key is not available.
   */
  public toAddressECDSA(network: NetworkType): Address {
    if (!this.publicKey) {
      throw new Error(
        'Ecdsa public key is not available for ECDSA address generation'
      );
    }
    const payload = base.fromHex(this.publicKey!);
    return new Address(
      NetworkTypeHelper.toAddressPrefix(network),
      AddressVersion.PubKeyECDSA,
      payload
    );
  }

  /**
   * Creates a Keypair instance from a private key hex string.
   * @param key - The private key as a hex string.
   * @returns The created Keypair instance.
   */
  public static fromPrivateKeyHex(key: string): Keypair {
    return new Keypair(
      key,
      base.toHex(signUtil.secp256k1.publicKeyCreate(base.fromHex(key), true)),
      base.toHex(
        signUtil.schnorr.secp256k1.schnorr.getPublicKey(base.fromHex(key))
      )
    );
  }

  /**
   * Creates a Keypair instance from a public key hex string.
   * @param pubKey - The public key as a hex string.
   * @returns The created Keypair instance.
   */
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

  /**
   * Creates a Keypair instance from an x-only public key hex string.
   * @param xOnlyPublicKeyHex - The x-only public key as a hex string.
   * @returns The created Keypair instance.
   */
  public static fromXOnlyPublicKeyHex(xOnlyPublicKeyHex: string): Keypair {
    return new Keypair(undefined, undefined, xOnlyPublicKeyHex);
  }

  /**
   * Signs a message with auxiliary data using the private key.
   * @param message - The message to sign.
   * @param auxData32 - The auxiliary data.
   * @returns The signature as a Uint8Array.
   * @throws If the private key is not available.
   */
  public signMessageWithAuxData(
    message: Uint8Array,
    auxData32: Uint8Array
  ): Uint8Array {
    if (!this.privateKey) {
      throw new Error('Secret key is not available for signing');
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

  /**
   * Verifies a message signature using the x-only public key.
   * @param signature - The signature to verify.
   * @param message - The message that was signed.
   * @returns True if the signature is valid, false otherwise.
   */
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
