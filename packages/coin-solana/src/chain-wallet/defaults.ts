import { Chain, ChainAssetType } from '@delandlabs/coin-base/model';
import { Commitment } from '@solana/web3.js';

export const CHAIN_NAME = 'Solana';
export const CHAIN = Chain.Solana;
export const NATIVE_ASSET = ChainAssetType.Native;
export const FT_ASSET = ChainAssetType.SPL;
export const DERIVING_PATH = "m/44'/501'/0'/0'";
export const DEFAULT_COMMITMENT: Commitment = 'confirmed';
