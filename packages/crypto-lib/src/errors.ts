/**
 * Custom error types for crypto-lib
 */

/**
 * Base error class for all crypto-lib errors
 */
export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
    Object.setPrototypeOf(this, CryptoError.prototype);
  }
}

/**
 * Error thrown when encoding/decoding operations fail
 */
export class EncodingError extends CryptoError {
  constructor(message: string) {
    super(message);
    this.name = 'EncodingError';
    Object.setPrototypeOf(this, EncodingError.prototype);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends CryptoError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when mathematical operations fail or inputs are out of range
 */
export class MathError extends CryptoError {
  constructor(message: string) {
    super(message);
    this.name = 'MathError';
    Object.setPrototypeOf(this, MathError.prototype);
  }
}

/**
 * Error thrown when hash operations fail
 */
export class HashError extends CryptoError {
  constructor(message: string) {
    super(message);
    this.name = 'HashError';
    Object.setPrototypeOf(this, HashError.prototype);
  }
}
