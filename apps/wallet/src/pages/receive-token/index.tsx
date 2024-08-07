import { observer } from "mobx-react";
import { FC, useEffect, useState } from "react";
import hibitIdSession from "../../stores/session";
import QRCode from 'qrcode'
import { useNavigate } from "react-router-dom";
import SvgGo from '../../assets/right-arrow.svg?react';
import CopyButton from "../../components/CopyButton";

const ReceiveTokenPage: FC = observer(() => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const navigate = useNavigate()

  const address = hibitIdSession.address
  const chainInfo = hibitIdSession.chainInfo

  useEffect(() => {
    if (!canvas || !address) return;
    QRCode.toCanvas(canvas, address, {
      width: 164,
    })
  }, [canvas, address])
  
  return (
    <div className="h-full px-6 overflow-auto">
      <div>
        <button className="btn btn-ghost btn-sm gap-2 items-center pl-0" onClick={() => navigate(-1)}>
          <SvgGo className="size-6 rotate-180" />
          <span className="text-xs">Receive</span>
        </button>
      </div>
      <div className="mt-6 flex flex-col items-center gap-6">
        <p>{`Receive Assets on ${chainInfo?.name ?? '--'}`}</p>
        <div className="size-[180px] p-2 bg-base-100 rounded-xl">
          <canvas ref={setCanvas} className="size-full rounded-lg" />
        </div>
        <div className="max-w-full p-2 pr-1 flex items-center gap-2 bg-base-100 rounded-xl">
          <span className="text-xs break-all">{address}</span>
          <CopyButton copyText={address} />
        </div>
      </div>
    </div>
  )
})

export default ReceiveTokenPage
