import { observer } from "mobx-react";
import { FC } from "react";
import { useTokenListQuery } from "../apis/react-query/token";
import TokenIcon from "./TokenIcon";
import SvgGo from '../assets/go.svg?react'
import { useNavigate } from "react-router-dom";

const TokenList: FC = observer(() => {
  const navigate = useNavigate()
  const assetsQuery = useTokenListQuery()

  return (
    <ul className="flex flex-col gap-6">
      {assetsQuery.data?.map((asset) => (
        <li
          key={asset.assetId.toString()}
          className="flex items-center cursor-pointer"
          onClick={() => navigate(`/token/${asset.contractAddress || asset.assetSymbol}`)}
        >
          <TokenIcon token={asset} />
          <div className="flex-1 flex flex-col items-end">
            <span className="text-sm">0</span>
            <span className="text-xs text-neutral">$ 0.00</span>
          </div>
          <SvgGo />
        </li>
      ))}
    </ul>
  )
})

export default TokenList
