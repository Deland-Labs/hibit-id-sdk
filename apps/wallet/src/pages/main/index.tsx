import { observer } from "mobx-react";
import { FC } from "react";
import SendButton from "../../components/SendButton";
import ReceiveButton from "../../components/ReceiveButton";
import TokenList from "../../components/TokenList";
import { useTokenListQuery } from "../../apis/react-query/token";
import hibitIdSession from "../../stores/session";
import { useQuery } from "@tanstack/react-query";
import { ChainAssetType } from "../../utils/basicTypes";
import { formatAddress } from "../../utils/formatter";
import CopyButton from "../../components/CopyButton";
import SvgSettings from '../../assets/setting.svg?react';
import { Link, useNavigate } from "react-router-dom";
import ChainIcon from "../../components/ChainIcon";
import SvgCaret from '../../assets/caret-down.svg?react'

const WalletMainPage: FC = observer(() => {
  const navigate = useNavigate()
  const tokenListQuery = useTokenListQuery(hibitIdSession.chainInfo)
  const defaultTokenQuery = useQuery({
    queryKey: ['getDefaultToken', tokenListQuery.data],
    queryFn: async () => {
      return tokenListQuery.data?.find((token) => {
        return token.chainAssetType.equals(ChainAssetType.Native)
      }) ?? tokenListQuery.data?.[0] ?? null
    },
    enabled: !!tokenListQuery.data
  })

  const address = hibitIdSession.account?.address ?? ''

  return (
    <div className="h-full px-6 relative flex flex-col gap-6 overflow-auto">
      <div className="absolute top-0 left-6">
        <Link
          to="/network-select"
          className="btn btn-xs px-0 pr-1 gap-1 rounded-full bg-neutral"
        >
          <ChainIcon chainInfo={hibitIdSession.chainInfo} size="sm" onlyIcon />
          <SvgCaret />
        </Link>
      </div>
      <button className="btn btn-ghost btn-square btn-sm hover:bg-transparent absolute -top-1 right-6" onClick={() => {
        navigate('/settings')
      }}>
        <SvgSettings />
      </button>

      <div className="flex-none flex flex-col items-center gap-8 pb-6 border-b border-base-300">
        <h1 title={address} className="h-5 -mr-7 leading-5 text-xs flex items-center gap-1">
          <span>{formatAddress(address)}</span>
          <CopyButton copyText={address} />
        </h1>
        <div className="flex flex-col items-center">
          <span className="text-xs text-neutral">Net Worth</span>
          <span className="text-2xl">$ 0.00</span>
        </div>
        <div className="flex gap-10">
          <SendButton token={defaultTokenQuery.data || undefined} />
          <ReceiveButton />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <p className="text-neutral">Tokens</p>
        <div className="mt-6 flex-1 overflow-auto">
          <TokenList />
        </div>
      </div>
    </div>
  );
})

export default WalletMainPage
