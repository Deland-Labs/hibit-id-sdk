import { validateHexString } from '../src/base/helper';
import { describe, it, expect } from 'vitest';

describe('validateHexString', () => {
  it('returns true for valid hex string with 0x prefix', () => {
    expect(validateHexString('0x1a2b3c')).toBe(true);
  });

  it('returns true for valid hex string without 0x prefix', () => {
    expect(validateHexString('1a2b3c')).toBe(true);
  });
  it('returns true for valid hex string with 0X prefix', () => {
    expect(validateHexString('0X1A2B3C')).toBe(true);
  });

  it('returns false for invalid hex string', () => {
    expect(validateHexString('0x1g2h3i')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateHexString('')).toBe(false);
  });
  it('returns false for 0x string', () => {
    expect(validateHexString('0x')).toBe(false);
  });
  it('returns false for 0X string', () => {
    expect(validateHexString('0X')).toBe(false);
  });
  it('returns false for hex string with Chinese characters', () => {
    expect(validateHexString('0x1a2b3cnon-hex')).toBe(false);
  });
  it('returns false for hex string that contains spaces', () => {
    expect(validateHexString('0x1a2b3c abcdef')).toBe(false);
  });
  it('returns false for hex string containing non-hex characters and space', () => {
    expect(validateHexString('0x1a2b3c non-hex')).toBe(false);
  });

  it('returns false for valid hex string with odd length', () => {
    expect(validateHexString('0x1a2b3cf')).toBe(false);
  });

  it('returns false for hex string with odd length (no 0x prefix)', () => {
    expect(validateHexString('1a2b3cf')).toBe(false);
  });
});
