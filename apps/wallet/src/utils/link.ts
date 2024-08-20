import { ChainId } from "./basicTypes";
import { getChainByChainId } from "./chain";

export const getChainTxLink = (chainId: ChainId, txId: string) => {
  const chainInfo = getChainByChainId(chainId);
  if (chainInfo) {
    if (chainInfo.getTxLink) {
      return chainInfo.getTxLink(txId);
    }
    const [url, param] = chainInfo.explorer.split('?')
    return `${url}/tx/${txId}${param ? `?${param}` : ''}`;
  }
  return txId
};

export const getChainAddressLink = (
  chainId: ChainId,
  address: string
) => {
  const chainInfo = getChainByChainId(chainId);
  if (chainInfo) {
    if (chainInfo.getAddressLink) {
      return chainInfo.getAddressLink(address);
    }
    const [url, param] = chainInfo.explorer.split('?')
    return `${url}/address/${address}${param ? `?${param}` : ''}`;
  }
  return address
};
