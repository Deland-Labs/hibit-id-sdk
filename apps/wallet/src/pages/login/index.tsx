import { FC, useEffect, useMemo, useState } from "react";
import { useIsDesktop } from "../../utils/hooks";
import rpcManager from "../../stores/rpc";
import Modal from "../../components/Modal";
import SvgLogo from '../../assets/logo.svg?react';
import { AuthManager } from "../../utils/auth";
import AuthenticatorButton from "../../components/AuthenticatorButton";
import { observer } from "mobx-react";
import PageLoading from "../../components/PageLoading";
import { useNavigate } from "react-router-dom";
import hibitIdSession from "../../stores/session";
import { twMerge } from "tailwind-merge";

const LoginPage: FC = observer(() => {
  const [loginSuccess, setLoginSuccess] = useState(false)

  const isDesktop = useIsDesktop()
  const navigate = useNavigate()

  const loginContent = useMemo(() => {
    if (loginSuccess && !hibitIdSession.isLoggedIn) {
      return <PageLoading />
    }
    return (
      <div className="h-full flex flex-col items-center py-4">
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="flex justify-center items-center size-20 rounded-full [background:linear-gradient(180deg,#16D6FF_0%,#0099E6_100%)]">
            <SvgLogo className="size-9" />
          </div>
          <h1 className="mt-6 text-neutral">Hibit ID</h1>
          <p className="mt-2 font-bold text-xl">
            Link <span className="text-primary">Web2</span> to <span className="text-primary">Web3</span> world
          </p>
        </div>
        <div className="w-full flex-none flex flex-col gap-4 items-center">
          <p className="text-neutral text-xs">Login By</p>
          <div className="flex items-center gap-8">
            {AuthManager.supportedAuthenticators.map((type) => (
              <AuthenticatorButton key={type} type={type} onSuccess={() => setLoginSuccess(true)} />
            ))}
          </div>
        </div>
      </div>
    )
  }, [loginSuccess])

  useEffect(() => {
    if (loginSuccess && hibitIdSession.isLoggedIn) {
      navigate('/')
    }
  }, [loginSuccess, hibitIdSession.isLoggedIn])

  return (
    <Modal
      visible
      title={isDesktop ? 'Hibit ID' : ''}
      onClose={() => rpcManager.notifyClose()}
      content={loginContent}
      modalClassName={twMerge('max-w-full', isDesktop && 'w-[480px]', !isDesktop && 'w-[327px] h-[560px]')}
    />
  )
})

export default LoginPage;
