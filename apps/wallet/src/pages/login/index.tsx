import { FC, useEffect, useMemo, useState } from "react";
import { useIsDesktop } from "../../utils/hooks";
import rpcManager from "../../stores/rpc";
import Modal from "../../components/Modal";
import { AuthManager } from "../../utils/auth";
import AuthenticatorButton from "../../components/AuthenticatorButton";
import { observer } from "mobx-react";
import PageLoading from "../../components/PageLoading";
import { useNavigate } from "react-router-dom";
import hibitIdSession from "../../stores/session";
import { twMerge } from "tailwind-merge";
import LogoSection from "../../components/LogoSection";
import { useTranslation } from "react-i18next";

const LoginPage: FC = observer(() => {
  const [loginSuccess, setLoginSuccess] = useState(false)
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const loginContent = useMemo(() => {
    if (loginSuccess && !hibitIdSession.isLoggedIn) {
      return (
        <div className="h-full py-8">
          <PageLoading />
        </div>
      )
    }
    return (
      <div className="h-full flex flex-col items-center py-4">
        <LogoSection />

        <div className="w-full flex-none flex flex-col gap-4 items-center">
          <p className="text-neutral text-xs">{t('page_login_loginBy')}</p>
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
