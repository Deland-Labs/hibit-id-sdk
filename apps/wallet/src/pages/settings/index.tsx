import { observer } from "mobx-react";
import { FC } from "react";
import SvgGo from '../../assets/right-arrow.svg?react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthenticatorLogo from "../../components/AuthenticatorLogo";
import { AuthenticatorType } from "@deland-labs/hibit-id-sdk";
import hibitIdSession from "../../stores/session";

const SettingsPage: FC = observer(() => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const userName: string = (hibitIdSession.auth?.decodedIdToken?.preferred_username
    || hibitIdSession.auth?.decodedIdToken?.unique_name) as string
  
  return (
    <div className="h-full px-6 overflow-auto">
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-square btn-sm items-center" onClick={() => navigate(-1)}>
          <SvgGo className="size-6 rotate-180" />
        </button>
        <span className="text-xs">{t('page_settings_title')}</span>
      </div>

      <div className="mt-6">
        <p className="label-text text-neutral text-xs">
          {t('page_settings_account')}
        </p>
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs">
            <AuthenticatorLogo type={AuthenticatorType.Telegram} className="size-6" />
            <span>{userName}</span>
          </div>
          <button className="btn btn-link btn-xs no-underline p-0" onClick={() => {
            navigate('/account-manage')
          }}>
            {t('page_settings_linkMore')}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="label-text text-neutral text-xs">
          {t('page_settings_security')}
        </p>
        <button className="btn btn-link btn-xs mt-4 no-underline p-0" onClick={() => {
          navigate('/change-password')
        }}>
          {t('page_settings_changePassword')}
        </button>
      </div>
    </div>
  )
})

export default SettingsPage;
