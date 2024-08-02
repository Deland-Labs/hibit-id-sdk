import { observer } from "mobx-react";
import { FC } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTokenBalanceQuery, useTokenQuery } from "../../apis/react-query/token";
import SvgGo from '../../assets/right-arrow.svg?react'
import TokenIcon from "../../components/TokenIcon";
import { getChainByChainId } from "../../utils/chain";
import { ChainId } from "../../utils/basicTypes";
import SendButton from "../../components/SendButton";
import ReceiveButton from "../../components/ReceiveButton";
import PageLoading from "../../components/PageLoading";
import { formatNumber } from "../../utils/formatter";

const TokenDetailPage: FC = observer(() => {
  const { addressOrSymbol } = useParams()
  const navigate = useNavigate()
  const tokenQuery = useTokenQuery(addressOrSymbol?? '')
  const balanceQuery = useTokenBalanceQuery(tokenQuery.data || undefined)

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
      <div>
        <button className="btn btn-ghost btn-sm gap-2 items-center pl-0" onClick={() => navigate('/')}>
          <SvgGo className="size-6 rotate-180" />
          <span className="text-xs">{token.assetSymbol}</span>
        </button>
      </div>
      <div className="mt-8 flex flex-col items-center gap-10">
        <div className="flex flex-col items-center">
          <TokenIcon token={token} size="lg" onlyIcon />
          <span className="mt-2 text-sm">{token.assetSymbol}</span>
          <span className="text-xs text-neutral">{chainInfo?.name}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl">
            {balanceQuery.isLoading && (
              <span className="loading loading-spinner loading-sm"></span>
            )}
            {balanceQuery.data && (
              <span>{`${formatNumber(balanceQuery.data)} ${token.assetSymbol}`}</span>
            )}
          </span>
          <span className="text-xs text-neutral">$0.00</span>
        </div>
        <div className="flex items-center gap-10">
          <SendButton token={token} />
          <ReceiveButton token={token} />
        </div>
      </div>
    </div>
  )  
})

export default TokenDetailPage
