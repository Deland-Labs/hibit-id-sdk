import { observer } from "mobx-react"
import { FC } from "react"
import SvgSend from '../assets/send.svg?react'
import { useNavigate } from "react-router-dom"
import { RootAssetInfo } from "../apis/models"

export interface SendButtonProps {
  token?: RootAssetInfo
}

const SendButton: FC<SendButtonProps> = observer(({ token }) => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className="btn btn-primary btn-circle btn-sm size-9"
        onClick={() => {
          navigate(`/send${token ? `/${token.contractAddress || token.assetSymbol}` : ''}`)
        }}
      >
        <SvgSend />
      </button>
      <span className="text-neutral text-xs">Send</span>
    </div>
  )
})

export default SendButton
