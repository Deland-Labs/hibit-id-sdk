import { observer } from "mobx-react";
import { FC } from "react";
import SendButton from "../../components/SendButton";
import ReceiveButton from "../../components/ReceiveButton";
import TokenList from "../../components/TokenList";
import { useTokenListQuery } from "../../apis/react-query/token";
import ChainSelect from "../../components/ChainSelect";
import hibitIdSession from "../../stores/session";
import { useQuery } from "@tanstack/react-query";
import { ChainAssetType } from "../../utils/basicTypes";
import { formatAddress } from "../../utils/formatter";
import CopyButton from "../../components/CopyButton";

const WalletMainPage: FC = observer(() => {
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

  const address = hibitIdSession.address

  return (
    <div className="h-full relative flex flex-col">
      <div className="absolute top-0 left-0">
        <ChainSelect
          value={hibitIdSession.chainInfo}
          onChange={(chain) => {
            hibitIdSession.switchChain(chain)
          }}
        />
      </div>

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
          <ReceiveButton token={defaultTokenQuery.data || undefined} />
        </div>
      </div>

      <div className="mt-6 flex-1 flex flex-col overflow-hidden">
        <p className="text-neutral">Tokens</p>
        <div className="mt-6 flex-1 overflow-auto">
          <TokenList />
        </div>
      </div>
    </div>
  );
})

export default WalletMainPage
