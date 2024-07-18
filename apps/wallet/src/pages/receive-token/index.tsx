import { observer } from "mobx-react";
import { FC, useEffect, useRef } from "react";
import hibitIdSession from "../../stores/session";
import QRCode from 'qrcode'
import { useNavigate, useParams } from "react-router-dom";
import { useTokenQuery } from "../../apis/react-query/token";
import PageLoading from "../../components/PageLoading";
import SvgGo from '../../assets/right-arrow.svg?react';
import { getChainByChainId } from "../../utils/chain";
import { ChainId } from "../../utils/basicTypes";
import CopyButton from "../../components/CopyButton";

const ReceiveTokenPage: FC = observer(() => {
  const { addressOrSymbol } = useParams()
  const tokenQuery = useTokenQuery(addressOrSymbol ?? '')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()

  const address = hibitIdSession.address

  useEffect(() => {
    if (!canvasRef.current || !address) return;
    QRCode.toCanvas(canvasRef.current, address)
  }, [address])

  if (tokenQuery.isLoading || typeof tokenQuery.data === 'undefined') {
    return <PageLoading />
  }

  if (tokenQuery.data === null) {
    return (
      <div>token not found</div>
    )
  }

  const token = tokenQuery.data
  const chainInfo = getChainByChainId(new ChainId(token.chain, token.chainNetwork))

  return (
    <div>
      <div>
        <button className="btn btn-ghost btn-sm gap-2 items-center pl-0" onClick={() => navigate(-1)}>
          <SvgGo className="size-6 rotate-180" />
          <span className="text-xs">Receive</span>
        </button>
      </div>
      <div className="flex flex-col items-center gap-6">
        <p>{`Receive Assets on ${chainInfo?.name ?? '--'}`}</p>
        <div className="p-2 bg-base-100 rounded-xl">
          <canvas ref={canvasRef} className="size-full rounded-lg" />
        </div>
        <div className="p-2 pr-1 flex items-center gap-2 bg-base-100 rounded-xl">
          <span className="text-xs">{address}</span>
          <CopyButton copyText={address} />
        </div>
      </div>
    </div>
  )
})

export default ReceiveTokenPage
