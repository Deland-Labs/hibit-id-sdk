import { Chain, ChainAssetType } from '@delandlabs/coin-base';

const DERIVING_PATH = "m/44'/607'/0'/0/0";
const CHAIN = Chain.Ton;
const CHAIN_NAME = 'Ton';
const NATIVE_ASSET = ChainAssetType.Native;
const FT_ASSET = ChainAssetType.Jetton;

export { DERIVING_PATH, CHAIN, CHAIN_NAME, NATIVE_ASSET, FT_ASSET };
