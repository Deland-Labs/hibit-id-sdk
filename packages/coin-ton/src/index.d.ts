/**
 * @fileoverview TON blockchain integration for Hibit ID SDK
 *
 * This module provides comprehensive TON blockchain functionality including:
 * - Native TON transfers with memo support
 * - Jetton (fungible token) transfers
 * - TON Connect integration for dApp interactions
 * - Message signing according to TON specifications
 * - Fee estimation for both native and Jetton transfers
 *
 * @example
 * ```typescript
 * import { TonChainWallet } from '@delandlabs/coin-ton';
 * import { ChainId, ChainNetwork, ChainType } from '@delandlabs/hibit-basic-types';
 *
 * const chainInfo = {
 *   chainId: new ChainId(ChainType.TON, ChainNetwork.TonMainNet),
 *   name: 'TON Mainnet',
 *   rpc: { primary: 'https://toncenter.com/api/v2/jsonRPC' }
 * };
 *
 * const wallet = new TonChainWallet(
 *   chainInfo,
 *   'your mnemonic phrase here',
 *   { keyDerivationMethod: 'ton-native' }
 * );
 *
 * const account = await wallet.getAccount();
 * console.log('TON Address:', account.address);
 * ```
 */
export * from './chain-wallet';
