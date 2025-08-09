/**
 * @fileoverview TON Chain Wallet Implementation
 *
 * This module contains the main TON blockchain wallet implementation
 * with comprehensive support for TON native operations and Jetton tokens.
 *
 * Key Features:
 * - Dual key derivation methods (TON native and Ed25519)
 * - Native TON transfers with optional payloads
 * - Jetton token transfers with automatic decimal handling
 * - TON Connect protocol support for dApp integration
 * - Comprehensive error handling and retry logic
 * - Extensive logging and monitoring capabilities
 */
export * from './wallet';
