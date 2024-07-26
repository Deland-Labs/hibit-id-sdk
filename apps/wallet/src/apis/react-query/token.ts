import { useQuery } from "@tanstack/react-query"
import { QueryCacheKey } from "./query-keys"
import { GetAllAssetsAsync } from "../services/token"
import { getSupportedChains } from "../../utils/chain"
import { ChainId, ChainInfo } from "../../utils/basicTypes"
import { RootAssetInfo } from "../models"
import hibitIdSession from "../../stores/session"
import BigNumber from "bignumber.js"
import { SYSTEM_MAX_DECIMALS } from "../../utils/formatter/numberFormatter";

export const useTokenListQuery = (chain?: ChainInfo) => {
  return useQuery({
    queryKey: [QueryCacheKey.GET_TOKEN_LIST, chain?.chainId.toString() ?? ''],
    queryFn: async () => {
      const res = await GetAllAssetsAsync()
      if (!res.isSuccess || !res.value) {
        throw new Error('Get token list failed')
      }
      const supportedChains = getSupportedChains()
      const chainTokens = res.value.filter((token) => {
        return (
          !!supportedChains.find((chain) => chain.chainId.equals(new ChainId(token.chain, token.chainNetwork)))
            && (chain ? chain.chainId.equals(new ChainId(token.chain, token.chainNetwork)) : true)
        )
      })
      return chainTokens
    }
  })
}

export const useTokenQuery = (addressOrSymbol: string) => {
  const allTokensQuery = useTokenListQuery()

  return useQuery({
    queryKey: [QueryCacheKey.GET_TOKEN, addressOrSymbol],
    queryFn: async () => {
      return allTokensQuery.data?.find((token) => {
        return token.contractAddress === addressOrSymbol || token.assetSymbol === addressOrSymbol
      }) ?? null
    },
    enabled: !!allTokensQuery.data
  })
}

export const useTokenBalanceQuery = (token?: RootAssetInfo) => {
  return useQuery({
    queryKey: [QueryCacheKey.GET_TOKEN_BALANCE, hibitIdSession.wallet?.chainInfo, token?.assetId.toString()],
    queryFn: async () => {
      if (!hibitIdSession.wallet || !token) {
        return new BigNumber(0)
      }
      const address = (await hibitIdSession.wallet.getAccount()).address
      return (await hibitIdSession.wallet?.balanceOf(address, token))?.dp(SYSTEM_MAX_DECIMALS, BigNumber.ROUND_FLOOR)
    },
    enabled: !!token
    // FIXME: stop refetch if hidden
    // refetchInterval: 10000,
  })
}
