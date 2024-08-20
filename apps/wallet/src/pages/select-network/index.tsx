import { observer } from "mobx-react";
import { FC, useMemo } from "react";
import ChainIcon from "../../components/ChainIcon";
import { ChainInfo } from "../../utils/basicTypes";
import { getSupportedChains } from "../../utils/chain";
import { useTranslation } from "react-i18next";
import hibitIdSession from "../../stores/session";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";

const SelectNetworkPage: FC = observer(() => {
  const { t } = useTranslation()
  const navigate = useNavigate()

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
    <div className="h-full px-6 overflow-auto flex flex-col gap-6">
      <PageHeader title="Select Network" />
      <div className="-mx-1 px-1.5 flex-1 flex flex-col gap-6 overflow-auto">
        {Object.entries(chains).map(([chainName, chainList]) => (
          <div key={chainName}>
            <span className="text-neutral text-xs">{`${chainName} ${t('common_ecosystem')}`}</span>
            <ul className="mt-2 flex flex-col gap-2">
              {chainList.map((chainInfo) => (
                <li
                  key={chainInfo.chainId.toString()}
                  className="h-10 px-2 flex items-center cursor-pointer rounded-lg hover:outline hover:outline-primary hover:bg-white/10"
                  onClick={() => {
                    hibitIdSession.switchChain(chainInfo)
                    navigate('/')
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
  )
})

export default SelectNetworkPage
