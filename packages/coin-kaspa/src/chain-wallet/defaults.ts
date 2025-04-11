import { Chain, ChainAssetType } from '@delandlabs/coin-base/model';

const DERIVING_PATH = "m/44'/111111'/0'/0/0";
const CHAIN = Chain.Kaspa;
const CHAIN_NAME = 'Kaspa';
const NATIVE_ASSET = ChainAssetType.Native;
const FT_ASSET = ChainAssetType.KRC20;

export { DERIVING_PATH, CHAIN, CHAIN_NAME, NATIVE_ASSET, FT_ASSET };
