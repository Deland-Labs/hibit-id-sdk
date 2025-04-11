import { Chain, ChainAssetType } from '@delandlabs/coin-base/model';
import { Buffer } from 'buffer';

const DERIVING_PATH = "m/44'/607'/0'";
const CHAIN = Chain.Ton;
const CHAIN_NAME = 'Ton';
const NATIVE_ASSET = ChainAssetType.Native;
const FT_ASSET = ChainAssetType.Jetton;
const MAGIC = 'ton-safe-sign-magic';
const MAGIC_BYTES = Buffer.from(MAGIC).length;

export { DERIVING_PATH, CHAIN, CHAIN_NAME, NATIVE_ASSET, FT_ASSET, MAGIC_BYTES };
