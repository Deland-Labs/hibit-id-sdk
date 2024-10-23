import { observer } from "mobx-react";
import { FC } from "react";
import { useParams } from "react-router-dom";
import { useTokenBalanceQuery, useTokenQuery, useTokenFiatValueQuery } from "../../apis/react-query/token";
import TokenIcon from "../../components/TokenIcon";
import { getChainByChainId } from "../../utils/chain";
import { ChainId } from "../../utils/basicTypes";
import SendButton from "../../components/SendButton";
import ReceiveButton from "../../components/ReceiveButton";
import PageLoading from "../../components/PageLoading";
import { formatNumber } from "../../utils/formatter";
import PageHeader from "../../components/PageHeader";
import BigNumber from "bignumber.js";

const TokenDetailPage: FC = observer(() => {
  const { addressOrSymbol } = useParams()
  const tokenQuery = useTokenQuery(addressOrSymbol?? '')
  const balanceQuery = useTokenBalanceQuery(tokenQuery.data || undefined)
  const usdValueQuery = useTokenFiatValueQuery(tokenQuery.data || undefined, balanceQuery.data)

  if (tokenQuery.isLoading || typeof tokenQuery.data === 'undefined') {
    return <PageLoading />
  }

  if (tokenQuery.data === null) {
    return (
      <div>token not found</div>
    )
  }

  const token = tokenQuery.data

  const chainInfo = getChainByChainId(new ChainId(token.chain, token.chainNetwork))

  return (
    <div className="h-full px-6 overflow-auto">
      <PageHeader title={token.assetSymbol} />
      <div className="mt-8 flex flex-col items-center gap-10">
        <div className="flex flex-col items-center">
          <TokenIcon token={token} size="lg" onlyIcon />
          <span className="mt-2 text-sm">{token.assetSymbol}</span>
          <span className="text-xs text-neutral">{chainInfo?.name}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl">
            {balanceQuery.isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <span>{`${formatNumber(balanceQuery.data)} ${token.assetSymbol}`}</span>
            )}
          </span>
          <span className="text-xs text-neutral">$ {(usdValueQuery.data ?? new BigNumber(0)).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-10">
          <SendButton token={token} />
          <ReceiveButton />
        </div>
      </div>
    </div>
  )  
})

export default TokenDetailPage
