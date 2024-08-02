import { observer } from "mobx-react";
import { FC, useMemo } from "react";
import ChainIcon from "./ChainIcon";
import Popover from "./Popover";
import SvgCaret from '../assets/caret-down.svg?react'
import SvgRightArrow from '../assets/right-arrow.svg?react'
import { ChainInfo } from "../utils/basicTypes";
import { getSupportedChains } from "../utils/chain";
import { useTranslation } from "react-i18next";

export interface ChainSelectProps {
  value: ChainInfo
  onChange: (chain: ChainInfo) => void
}

const ChainSelect: FC<ChainSelectProps> = observer(({ value, onChange }) => {
  const { t } = useTranslation()

  const chains = useMemo(() => {
    const chainsMap: Record<string, ChainInfo[]> = {}
    const supportedChains = getSupportedChains()
    supportedChains.forEach((chain) => {
      if (!chainsMap[chain.chainId.type.name]) {
        chainsMap[chain.chainId.type.name] = []
      }
      chainsMap[chain.chainId.type.name].push(chain)
    })
    return chainsMap
  }, [])

  return (
    <Popover
      placement="bottom-start"
      content={(close) => (
        <div className="min-w-[280px] p-6 rounded-lg bg-base-300 flex flex-col gap-6">
          <div className="flex-none flex items-center gap-2 text-xs">
            <button className="btn btn-xs btn-square btn-ghost" onClick={close}>
              <SvgRightArrow className="rotate-180" />
            </button>
            <span>Select Network</span>
          </div>
          <div className="flex-1 flex flex-col gap-6">
            {Object.entries(chains).map(([chainName, chainList]) => (
              <div key={chainName}>
                <span className="text-neutral text-xs">{`${chainName} ${t('common_ecosystem')}`}</span>
                <ul className="mt-2 flex flex-col gap-2">
                  {chainList.map((chainInfo) => (
                    <li
                      key={chainInfo.chainId.toString()}
                      className="h-10 px-2 flex items-center cursor-pointer rounded-lg hover:outline hover:outline-primary hover:bg-white/10"
                      onClick={() => {
                        onChange(chainInfo)
                        close()
                      }}
                    >
                      <ChainIcon chainInfo={chainInfo} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    >
      <button className="btn btn-xs px-0 pr-1 gap-1 rounded-full bg-neutral">
        <ChainIcon chainInfo={value} size="sm" onlyIcon />
        <SvgCaret />
      </button>
    </Popover>
  )
})

export default ChainSelect
