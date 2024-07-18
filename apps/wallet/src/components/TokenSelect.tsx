import { FC } from "react";
import { RootAssetInfo } from "../apis/models";
import { observer } from "mobx-react";
import Dropdown from "./Dropdown";
import CaretSvg from '../assets/caret-down.svg?react';
import TokenIcon from "./TokenIcon";
import { useTokenListQuery } from "../apis/react-query/token";
import hibitIdSession from "../stores/session";

export interface TokenSelectProps {
  value: RootAssetInfo | null
  onChange: (value: RootAssetInfo) => void
}

const TokenSelect: FC<TokenSelectProps> = observer(({ value, onChange }) => {
  const tokenListQuery = useTokenListQuery(hibitIdSession.chainInfo.chainId.type)

  return (
    <Dropdown
      triggerContent={(
        <>
          <TokenIcon token={value} hideChain size="sm" />
          <CaretSvg />
        </>
      )}
      triggerProps={{
        className: 'px-2 h-8 min-w-[112px] justify-between'
      }}
      dropdownContent={(close) => (
        <div className="min-w-[200px] bg-base-300 rounded-xl p-2">
          <ul className="flex flex-col gap-2">
            {tokenListQuery.data?.map((token) => (
              <li key={token.assetId.toString()} className="cursor-pointer" onClick={() => {
                onChange(token)
                close()
              }}>
                <TokenIcon token={token} />
              </li>
            ))}
          </ul>
        </div>
      )}
    />
  )
})

export default TokenSelect
