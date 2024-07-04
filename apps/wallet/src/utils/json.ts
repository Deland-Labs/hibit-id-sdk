import BigNumber from 'bignumber.js';
import {
  AssetId,
  Chain,
  ChainNetwork,
  Ex3Decimal,
  Nonce,
  TransactionType,
  UserId
} from './basicTypes';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Ex3Response } from '../apis/models';

export class Ex3JSON {
  static stringify(obj: unknown): string {
    return JSON.stringify(obj, (key, value) => {
      if (value instanceof BigNumber) {
        return value.toString();
      } else if (value instanceof AssetId) {
        return value.value.toString();
      } else if (value instanceof UserId) {
        return value.value.toString();
      } else if (value instanceof Nonce) {
        return value.value.toString();
      } else if (value instanceof TransactionType) {
        return value.value.toString();
      } else if (value instanceof Chain) {
        return value.value.toString();
      } else if (value instanceof ChainNetwork) {
        return value.value.toString();
      } else if (value instanceof Ex3Decimal) {
        return value.toString();
      }
      return value;
    });
  }

  static parse<T>(str: string, classType: ClassConstructor<T>): T {
    return plainToInstance(classType, JSON.parse(str)) as T;
  }

  static parseEx3Ex3Response<T>(
    str: string,
    c: ClassConstructor<T>
  ): Ex3Response<T | null> {
    let obj = null;
    if (typeof str === 'string') {
      obj = JSON.parse(str);
    }
    return {
      isSuccess: obj?.isSuccess ?? false,
      message: obj?.message ?? '',
      value: obj ? plainToInstance(c, obj.value) : null
    };
  }

  static parseEx3Ex3ResponseArray<T>(
    str: string,
    c: ClassConstructor<T>
  ): Ex3Response<T[] | null> {
    let obj = null;
    if (typeof str === 'string') {
      obj = JSON.parse(str);
    }
    return {
      isSuccess: obj?.isSuccess ?? false,
      message: obj?.message ?? '',
      value: obj ? plainToInstance(c, obj.value as unknown[]) : null
    };
  }
}
