import { observer } from "mobx-react";
import { FC, useEffect, useState } from "react";
import hibitIdSession from "../../stores/session";
import QRCode from 'qrcode'
import CopyButton from "../../components/CopyButton";
import PageHeader from "../../components/PageHeader";
import { useTranslation } from "react-i18next";

const ReceiveTokenPage: FC = observer(() => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const { t } = useTranslation()

  const address = hibitIdSession.account?.address ?? ''
  const chainInfo = hibitIdSession.chainInfo

  useEffect(() => {
    if (!canvas || !address) return;
    QRCode.toCanvas(canvas, address, {
      width: 164,
    })
  }, [canvas, address])
  
  return (
    <div className="h-full px-6 overflow-auto">
      <PageHeader title={t('page_receive_title')} />
      <div className="mt-6 flex flex-col items-center gap-6">
        <p>{t('page_receive_desc', { chainName: chainInfo?.name ?? '--' })}</p>
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
