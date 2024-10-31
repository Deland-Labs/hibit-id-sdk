import { Chain } from "../basicTypes";

export const formatAddress = (walletAddress: string, chainType?: Chain): string => {
  if (chainType?.equals(Chain.Dfinity)) {
    return walletAddress.slice(0, 5) + '...' + walletAddress.slice(-3)
  }
  return walletAddress?.length > 11
    ? walletAddress.slice(0, 5) + '...' + walletAddress.slice(-4)
    : walletAddress || '';
}
