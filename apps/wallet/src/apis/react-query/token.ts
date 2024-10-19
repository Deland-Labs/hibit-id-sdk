import { useQuery } from "@tanstack/react-query"
import { QueryCacheKey } from "./query-keys"
import { GetAllAssetsAsync } from "../services/token"
import { getSupportedChains } from "../../utils/chain"
import { AssetId, Chain, ChainAssetType, ChainId, ChainInfo, ChainNetwork, DecimalPlaces } from "../../utils/basicTypes"
import { RootAssetInfo } from "../models"
import hibitIdSession from "../../stores/session"
import BigNumber from "bignumber.js"
import { SYSTEM_MAX_DECIMALS } from "../../utils/formatter/numberFormatter";

export const useAllAssetListQuery = () => {
  return useQuery({
    queryKey: [QueryCacheKey.GET_ALL_ASSET_LIST],
    queryFn: async () => {
      const res = await GetAllAssetsAsync()
      if (!res.isSuccess || !res.value) {
        throw new Error('Get all asset list failed')
      }
      return [
        ...res.value,
        {
          assetId: new AssetId(new BigNumber(90000)),  // ICP temp id
          chain: Chain.Dfinity,
          chainNetwork: ChainNetwork.DfinityMainNet,
          chainAssetType: ChainAssetType.Native,
          contractAddress: '',
          decimalPlaces: DecimalPlaces.fromNumber(8),
          isBaseToken: true,
          orderNo: 999,
          icon: '',
          displayName: 'ICP',
          assetSymbol: 'ICP',
          subAssets: [],
        },
        {
          assetId: new AssetId(new BigNumber(90001)),  // DOD temp id
          chain: Chain.Dfinity,
          chainNetwork: ChainNetwork.DfinityMainNet,
          chainAssetType: ChainAssetType.ICRC1,
          contractAddress: 'cp4zx-yiaaa-aaaah-aqzea-cai',
          decimalPlaces: null, // decimal needs to be queried at runtime
          isBaseToken: true,
          orderNo: 999,
          icon: '',
          displayName: 'Doge On Doge',
          assetSymbol: 'DOD',
          subAssets: [],
        },
      ] as RootAssetInfo[]
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
export const useTokenListQuery = (chain?: ChainInfo) => {
  const allAssetListQuery = useAllAssetListQuery()
  return useQuery({
    queryKey: [QueryCacheKey.GET_TOKEN_LIST, chain?.chainId.toString() ?? ''],
    queryFn: async () => {
      const supportedChains = getSupportedChains()
      const flatSubTokens: RootAssetInfo[] = []
      allAssetListQuery.data!.forEach((token) => {
        if (token.subAssets.length <= 0) {
          return
        }
        flatSubTokens.push(...token.subAssets.map((sub) => ({
          ...sub,
          isBaseToken: token.isBaseToken,
          displayName: token.displayName,
          assetSymbol: token.assetSymbol,
          subAssets: []
        })))
      })
      const chainTokens = [...allAssetListQuery.data!, ...flatSubTokens].filter((token) => {
        return (
          !!supportedChains.find((chain) => chain.chainId.equals(new ChainId(token.chain, token.chainNetwork)))
            && (chain ? chain.chainId.equals(new ChainId(token.chain, token.chainNetwork)) : true)
        )
      })
      return chainTokens
    },
    enabled: !!allAssetListQuery.data
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
    queryKey: [QueryCacheKey.GET_TOKEN_BALANCE, token?.assetId.toString()],
    queryFn: async () => {
      if (!hibitIdSession.walletPool || !token) {
        return new BigNumber(0)
      }
      const chainId = new ChainId(token.chain, token.chainNetwork)
      const address = (await hibitIdSession.walletPool.getAccount(chainId)).address
      return (await hibitIdSession.walletPool.balanceOf(address, token))?.dp(SYSTEM_MAX_DECIMALS, BigNumber.ROUND_FLOOR)
    },
    enabled: !!token,
    refetchInterval: 10000,
  })
}

export const useTokenFiatValueQuery = (token?: RootAssetInfo, balance?: BigNumber) => {
  return useQuery({
    queryKey: [QueryCacheKey.GET_TOKEN_FIAT_VALUE, token?.assetId.toString(), balance],
    queryFn: async () => {
      let value = new BigNumber(0)
      if (token!.assetSymbol === 'USDT') {
        value = balance!.dp(2, BigNumber.ROUND_FLOOR)
      }
      // TODO: other tokens
      return value
    },
    enabled: !!token && !!balance,
  })
}
