import { ChainAssetType } from '@delandlabs/hibit-basic-types';

/**
 * Human-readable names for chain asset types
 */
export const ASSET_TYPE_NAMES: Record<ChainAssetType, string> = {
  [ChainAssetType.Native]: 'Native',
  [ChainAssetType.NativeGas]: 'NativeGas',
  [ChainAssetType.ERC20]: 'ERC20',
  [ChainAssetType.ERC721]: 'ERC721',
  [ChainAssetType.ICP]: 'ICP',
  [ChainAssetType.ICRC3]: 'ICRC3',
  [ChainAssetType.BRC20]: 'BRC20',
  [ChainAssetType.SPL]: 'SPL',
  [ChainAssetType.TRC20]: 'TRC20',
  [ChainAssetType.Jetton]: 'Jetton',
  [ChainAssetType.KRC20]: 'KRC20'
};

/**
 * Get human-readable name for a chain asset type
 * @param assetType - The asset type enum value
 * @returns Human-readable name or 'Unknown' if not found
 */
export function getAssetTypeName(assetType: ChainAssetType): string {
  return ASSET_TYPE_NAMES[assetType] || 'Unknown';
}