import { describe, expect, test } from 'vitest';
import { clearSensitiveArrays, clearSensitiveBuffers } from '../src/utils';

describe('crypto-utils', () => {
  describe('clearSensitiveArrays', () => {
    test('should clear single Uint8Array', () => {
      const arr = new Uint8Array([1, 2, 3, 4, 5]);
      clearSensitiveArrays(arr);

      expect(arr.every((byte) => byte === 0)).toBe(true);
    });

    test('should clear multiple Uint8Arrays', () => {
      const arr1 = new Uint8Array([1, 2, 3]);
      const arr2 = new Uint8Array([4, 5, 6]);
      const arr3 = new Uint8Array([7, 8, 9]);

      clearSensitiveArrays(arr1, arr2, arr3);

      expect(arr1.every((byte) => byte === 0)).toBe(true);
      expect(arr2.every((byte) => byte === 0)).toBe(true);
      expect(arr3.every((byte) => byte === 0)).toBe(true);
    });

    test('should handle null values safely', () => {
      const arr = new Uint8Array([1, 2, 3]);

      expect(() => clearSensitiveArrays(arr, null, undefined)).not.toThrow();
      expect(arr.every((byte) => byte === 0)).toBe(true);
    });

    test('should handle empty arrays', () => {
      const emptyArr = new Uint8Array(0);

      expect(() => clearSensitiveArrays(emptyArr)).not.toThrow();
    });

    test('should handle large arrays efficiently', () => {
      const largeArr = new Uint8Array(1024 * 1024); // 1MB
      largeArr.fill(255);

      clearSensitiveArrays(largeArr);

      expect(largeArr.every((byte) => byte === 0)).toBe(true);
    });

    test('should not throw on non-Uint8Array values', () => {
      const arr = new Uint8Array([1, 2, 3]);
      const notArray = { length: 3 } as any;

      expect(() => clearSensitiveArrays(arr, notArray)).not.toThrow();
      expect(arr.every((byte) => byte === 0)).toBe(true);
    });

    test('should handle no arguments', () => {
      expect(() => clearSensitiveArrays()).not.toThrow();
    });
  });

  describe('clearSensitiveBuffers', () => {
    test('should clear single Buffer', () => {
      const buf = Buffer.from([1, 2, 3, 4, 5]);
      clearSensitiveBuffers(buf);

      expect(buf.every((byte) => byte === 0)).toBe(true);
    });

    test('should clear multiple Buffers', () => {
      const buf1 = Buffer.from([1, 2, 3]);
      const buf2 = Buffer.from([4, 5, 6]);
      const buf3 = Buffer.from([7, 8, 9]);

      clearSensitiveBuffers(buf1, buf2, buf3);

      expect(buf1.every((byte) => byte === 0)).toBe(true);
      expect(buf2.every((byte) => byte === 0)).toBe(true);
      expect(buf3.every((byte) => byte === 0)).toBe(true);
    });

    test('should handle null and undefined values safely', () => {
      const buf = Buffer.from([1, 2, 3]);

      expect(() => clearSensitiveBuffers(buf, null, undefined)).not.toThrow();
      expect(buf.every((byte) => byte === 0)).toBe(true);
    });

    test('should handle empty buffers', () => {
      const emptyBuf = Buffer.alloc(0);

      expect(() => clearSensitiveBuffers(emptyBuf)).not.toThrow();
    });

    test('should handle Buffer.from string', () => {
      const buf = Buffer.from('sensitive data', 'utf8');
      const originalLength = buf.length;

      clearSensitiveBuffers(buf);

      expect(buf.length).toBe(originalLength);
      expect(buf.every((byte) => byte === 0)).toBe(true);
    });

    test('should not throw on non-Buffer values', () => {
      const buf = Buffer.from([1, 2, 3]);
      const notBuffer = new Uint8Array([4, 5, 6]) as any;

      expect(() => clearSensitiveBuffers(buf, notBuffer)).not.toThrow();
      expect(buf.every((byte) => byte === 0)).toBe(true);
      // The Uint8Array should not be affected
      expect(notBuffer[0]).toBe(4);
    });

    test('should handle no arguments', () => {
      expect(() => clearSensitiveBuffers()).not.toThrow();
    });
  });

  describe('Mixed usage', () => {
    test('should be able to use both functions together', () => {
      const arr = new Uint8Array([1, 2, 3]);
      const buf = Buffer.from([4, 5, 6]);

      clearSensitiveArrays(arr);
      clearSensitiveBuffers(buf);

      expect(arr.every((byte) => byte === 0)).toBe(true);
      expect(buf.every((byte) => byte === 0)).toBe(true);
    });
  });
});
