/**
 * @module @delandlabs/coin-dfinity
 *
 * Internet Computer Protocol (ICP) blockchain integration for Hibit ID SDK.
 *
 * This module provides a complete wallet implementation for the Internet Computer,
 * supporting native ICP transfers, ICRC token standards, and multiple address formats.
 *
 * @example
 * ```typescript
 * import { IcpChainWallet } from '@delandlabs/coin-dfinity';
 *
 * const wallet = new IcpChainWallet(chainInfo, mnemonic);
 * const account = await wallet.getAccount();
 * const balance = await wallet.balanceOf({ address: account.address, token });
 * ```
 */

export * from './chain-wallet';

// Register Dfinity validator
import { ChainType } from '@delandlabs/hibit-basic-types';
import { ChainValidation } from '@delandlabs/coin-base';
import { DfinityValidator } from './chain-wallet/validator';

ChainValidation.register(ChainType.Dfinity, new DfinityValidator());
