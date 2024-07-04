/* eslint-disable @typescript-eslint/no-explicit-any */
import { Buffer } from 'buffer';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import cbor from 'borc';
import * as secp from '@noble/secp256k1';
import BigNumber from 'bignumber.js';
import { Signature } from '@noble/secp256k1';
import {
  AssetId,
  Chain,
  ChainAssetType,
  ChainNetwork,
  DecimalPlaces,
  Ex3Decimal,
  Nonce,
  TransactionType,
  UserId
} from '../basicTypes';

export type HexString = string;
const cborIndexMetadataKey = Symbol('format');
const cborBigUintKey = Symbol('cbor_biguint');

export function cborIndex(index: number) {
  return Reflect.metadata(cborIndexMetadataKey, index);
}

export function cborBigInt() {
  return Reflect.metadata(cborBigUintKey, true);
}

function getCborIndex(target: any, propertyKey: string) {
  return Reflect.getMetadata(cborIndexMetadataKey, target, propertyKey);
}

function getCborBigInt(target: any, propertyKey: string) {
  return Reflect.getMetadata(cborBigUintKey, target, propertyKey);
}

export class CborDataFactory {
  public static createCborArray(data: any): any[] {
    if (!data) {
      return [];
    }
    const names = Object.getOwnPropertyNames(data);
    const cborData = [];
    for (const name of names) {
      const value = data[name];
      const index = getCborIndex(data, name);
      const isBigUint = getCborBigInt(data, name);
      if (index !== undefined) {
        // is value is a class, then recursively call createCborData
        if (value === undefined) {
          cborData[index] = null;
        } else if (value instanceof BigNumber) {
          cborData[index] = value;
        } else if (value instanceof Ex3Decimal) {
          cborData[index] = value.value;
        } else if (value instanceof AssetId) {
          cborData[index] = value.value;
        } else if (value instanceof Chain) {
          cborData[index] = value.value;
        } else if (value instanceof ChainNetwork) {
          cborData[index] = value.value;
        } else if (value instanceof UserId) {
          cborData[index] = value.value;
        } else if (value instanceof DecimalPlaces) {
          cborData[index] = value.value;
        } else if (value instanceof ChainAssetType) {
          cborData[index] = value.value;
        } else {
          if (value instanceof Object) {
            cborData[index] = this.createCborArray(value);
          } else {
            if (isBigUint) {
              if (value == null) {
                cborData[index] = null;
              } else {
                cborData[index] = BigNumber(value.toString());
              }
            } else {
              cborData[index] = value;
            }
          }
        }
      }
    }
    return cborData;
  }
}

export interface ClientRequest {
  type: TransactionType;
  version: number;
  userId: UserId;
  nonce: Nonce;
  message: HexString;
  hash: HexString;
  signature: HexString;
}

export interface UserKeyPair {
  publicKey: string;
  privateKey: string;
}

export class ClientRequestFactory {
  static verifySign: boolean = true;

  static async createEx3L2HeaderToken(
    userKeyPair: UserKeyPair
  ): Promise<string> {
    const msg = `Ex3L2:${new Date().getTime()}`;
    const hash = await secp.utils.sha256(Buffer.from(msg, 'utf-8'));
    const [signature, recId] = await secp.sign(
      hash,
      Buffer.from(userKeyPair.privateKey, 'hex'),
      {
        recovered: true
      }
    );
    const s = Signature.fromDER(Buffer.from(signature).toString('hex'));

    if (this.verifySign) {
      console.debug(
        'only verify sign in test env, please disable it in production env'
      );
      const publicKey = Buffer.from(userKeyPair.publicKey, 'hex');
      const verify = secp.verify(s, hash, publicKey);
      console.assert(verify);
      // console.log(`publicKey: ${Buffer.from(publicKey).toString('hex')}`);

      const recoverPublicKey = secp.recoverPublicKey(hash, s, recId, false);
      console.assert(secp.verify(s, hash, recoverPublicKey));
      // console.log(`recoverPublicKey: ${Buffer.from(recoverPublicKey).toString('hex')}`);
    }
    // concat recId to signature
    const recoverableSignature = Buffer.concat([
      s.toCompactRawBytes(),
      Buffer.from([recId])
    ]);
    // hasHex.messageHex:signatureHex
    return `${Buffer.from(msg).toString('hex')}.${Buffer.from(
      recoverableSignature
    ).toString('hex')}`;
  }

  static async createRequest<T>(
    txType: TransactionType,
    version: number,
    userId: UserId,
    nonce: Nonce,
    data: T,
    userKeyPair: UserKeyPair
  ): Promise<ClientRequest> {
    const messageBytes = Buffer.from(
      cbor.encode(CborDataFactory.createCborArray(data))
    );

    const txData = [
      version,
      txType.value,
      userId.value,
      nonce.value,
      messageBytes
    ];
    const txBytes = cbor.encode(txData);

    const hash = await secp.utils.sha256(txBytes);
    const [signature, recId] = await secp.sign(
      hash,
      Buffer.from(userKeyPair.privateKey, 'hex'),
      {
        recovered: true
      }
    );
    const s = Signature.fromDER(Buffer.from(signature).toString('hex'));

    if (this.verifySign) {
      console.debug(
        'only verify sign in test env, please disable it in production env'
      );
      const publicKey = Buffer.from(userKeyPair.publicKey, 'hex');
      const verify = secp.verify(s, hash, publicKey);
      console.assert(verify);
      // console.log(`publicKey: ${Buffer.from(publicKey).toString('hex')}`);

      const recoverPublicKey = secp.recoverPublicKey(hash, s, recId, false);
      console.assert(secp.verify(s, hash, recoverPublicKey));
      // console.log(`recoverPublicKey: ${Buffer.from(recoverPublicKey).toString('hex')}`);
    }
    // concat recId to signature
    const recoverableSignature = Buffer.concat([
      s.toCompactRawBytes(),
      Buffer.from([recId])
    ]);
    return {
      type: txType,
      version,
      userId,
      nonce,
      message: Buffer.from(messageBytes).toString('hex'),
      hash: Buffer.from(hash).toString('hex'),
      signature: Buffer.from(recoverableSignature).toString('hex')
    };
  }
}
