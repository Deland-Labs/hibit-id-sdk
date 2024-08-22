import { observer } from "mobx-react";
import { FC } from "react";
import { useTokenBalanceQuery, useTokenListQuery } from "../apis/react-query/token";
import TokenIcon from "./TokenIcon";
import SvgGo from '../assets/right-arrow.svg?react'
import { useNavigate } from "react-router-dom";
import { RootAssetInfo } from "../apis/models";
import hibitIdSession from "../stores/session";

const TokenListItem: FC<{ token: RootAssetInfo }> = ({ token }) => {
  const navigate = useNavigate()
  const balanceQuery = useTokenBalanceQuery(token)

  return (
    <li
      className="flex items-center cursor-pointer"
      onClick={() => navigate(`/token/${token.contractAddress || token.assetSymbol}`)}
    >
      <TokenIcon token={token} />
      <div className="flex-1 flex flex-col items-end">
        {balanceQuery.isFetching ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          <span className="text-sm">{balanceQuery.data?.toString() ?? '0'}</span>
        )}
        <span className="text-xs text-neutral">$ 0.00</span>
      </div>
      <SvgGo />
    </li>
  )
}

const TokenList: FC = observer(() => {
  const assetsQuery = useTokenListQuery(hibitIdSession.chainInfo)

  return (
    <ul className="flex flex-col gap-6">
      {assetsQuery.data?.map((asset) => (
        <TokenListItem key={asset.assetId.toString()} token={asset} />
      ))}
    </ul>
  )
})

export default TokenList
