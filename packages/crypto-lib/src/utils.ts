/**
 * Utility functions for cryptographic operations
 */

/**
 * Clears sensitive data from one or more Uint8Arrays by filling them with zeros
 * This helps prevent sensitive data from lingering in memory
 *
 * @param arrays - One or more Uint8Arrays to clear. Null or undefined values are safely ignored
 *
 * @example
 * // Clear a single array
 * clearSensitiveArrays(privateKey);
 *
 * @example
 * // Clear multiple arrays at once
 * clearSensitiveArrays(privateKey, publicKey, signature);
 *
 * @example
 * // Safe to call with null/undefined
 * clearSensitiveArrays(privateKey, null, publicKey);
 */
export function clearSensitiveArrays(...arrays: (Uint8Array | null | undefined)[]): void {
  for (const arr of arrays) {
    if (arr && arr instanceof Uint8Array) {
      arr.fill(0);
    }
  }
}

/**
 * Clears sensitive data from Buffer objects by filling them with zeros
 * This is a specialized version for Node.js Buffer objects
 *
 * @param buffers - One or more Buffers to clear. Null or undefined values are safely ignored
 */
export function clearSensitiveBuffers(...buffers: (Buffer | null | undefined)[]): void {
  for (const buf of buffers) {
    if (buf && Buffer.isBuffer(buf)) {
      buf.fill(0);
    }
  }
}
