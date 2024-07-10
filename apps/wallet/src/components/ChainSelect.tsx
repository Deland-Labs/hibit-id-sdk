import { observer } from "mobx-react";
import { FC } from "react";
import ChainIcon from "./ChainIcon";
import { EthereumSepolia } from "../utils/chain/chain-list";

const ChainSelect: FC = observer(() => {
  return (
    <ChainIcon chainInfo={EthereumSepolia} size="sm" onlyIcon />
  )
})

export default ChainSelect
