export const formatAddress = (walletAddress: string) =>
  walletAddress?.length > 11
    ? walletAddress.slice(0, 5) + '...' + walletAddress.slice(-4)
    : walletAddress || '';
