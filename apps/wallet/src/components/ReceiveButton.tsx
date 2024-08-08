import { observer } from "mobx-react"
import { FC } from "react"
import SvgReceive from '../assets/receive.svg?react'
import { useNavigate } from "react-router-dom"

const ReceiveButton: FC = observer(() => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className="btn btn-secondary btn-circle btn-sm size-9"
        onClick={() => {
          navigate('/receive')
        }}
      >
        <SvgReceive />
      </button>
      <span className="text-neutral text-xs">Receive</span>
    </div>
  )
})

export default ReceiveButton
