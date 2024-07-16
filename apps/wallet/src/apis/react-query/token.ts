import { useQuery } from "@tanstack/react-query"
import { QueryCacheKey } from "./query-keys"
import { GetAllAssetsAsync } from "../services/token"
import { getSupportedChains } from "../../utils/chain"
import { ChainId } from "../../utils/basicTypes"
import { RootAssetInfo } from "../models"
import hibitIdSession from "../../stores/session"
import BigNumber from "bignumber.js"

export const useTokenListQuery = () => {
  return useQuery({
    queryKey: [QueryCacheKey.GET_TOKEN_LIST],
    queryFn: async () => {
      const res = await GetAllAssetsAsync()
      if (!res.isSuccess || !res.value) {
        throw new Error('Get token list failed')
      }
      const supportedChains = getSupportedChains()
      const chainTokens = res.value.filter((token) => {
        return !!supportedChains.find((chain) => chain.chainId.equals(new ChainId(token.chain, token.chainNetwork)))
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

export const useTokenBalanceQuery = (token: RootAssetInfo) => {
  return useQuery({
    queryKey: [QueryCacheKey.GET_TOKEN_BALANCE, token.assetId.toString()],
    queryFn: async () => {
      if (!hibitIdSession.wallet) {
        return new BigNumber(0)
      }
      return await hibitIdSession.wallet?.balanceOf(hibitIdSession.wallet.getAddress(), token)
    },
    // FIXME: stop refetch if hidden
    // refetchInterval: 10000,
  })
}
