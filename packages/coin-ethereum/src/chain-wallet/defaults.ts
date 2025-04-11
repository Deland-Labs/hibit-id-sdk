import { Chain, ChainAssetType } from '@delandlabs/coin-base/model';

const DERIVING_PATH = "m/44'/60'/0'/0/0";
const CHAIN = Chain.Ethereum;
const CHAIN_NAME = 'Ethereum';
const NATIVE_ASSET = ChainAssetType.Native;
const FT_ASSET = ChainAssetType.ERC20;

export { DERIVING_PATH, CHAIN, CHAIN_NAME, NATIVE_ASSET, FT_ASSET };
