import { Chain, ChainAssetType } from '@delandlabs/coin-base/model';

const DERIVING_PATH = "m/44'/195'/0'/0/0";
const ADDRESS_PREFIX_BYTE = 0x41;
const CHAIN = Chain.Tron;
const CHAIN_NAME = 'Tron';
const NATIVE_ASSET = ChainAssetType.Native;
const FT_ASSET = ChainAssetType.TRC20;

export { DERIVING_PATH, ADDRESS_PREFIX_BYTE, CHAIN, CHAIN_NAME, NATIVE_ASSET, FT_ASSET };
