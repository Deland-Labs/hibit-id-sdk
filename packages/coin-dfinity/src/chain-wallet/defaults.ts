import { Chain, ChainAssetType } from '@delandlabs/coin-base/model';

const DERIVING_PATH = "m/44'/223'/0'/0/0";
const CHAIN = Chain.Dfinity;
const CHAIN_NAME = 'ICP';
const NATIVE_ASSET = ChainAssetType.ICP;
const FT_ASSET = ChainAssetType.ICRC3;

export { DERIVING_PATH, CHAIN, CHAIN_NAME, NATIVE_ASSET, FT_ASSET };
