import { observer } from "mobx-react";
import { FC } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthenticatorLogo from "../../components/AuthenticatorLogo";
import { AuthenticatorType } from "@delandlabs/hibit-id-sdk";
import hibitIdSession from "../../stores/session";
import PageHeader from "../../components/PageHeader";
import SvgGo from '../../assets/right-arrow.svg?react'

const SettingsPage: FC = observer(() => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const userName: string = (hibitIdSession.auth?.decodedIdToken?.preferred_username
    || hibitIdSession.auth?.decodedIdToken?.unique_name) as string
  
  return (
    <div className="h-full px-6 overflow-auto">
      <PageHeader title={t('page_settings_title')} />
      <div className="mt-6">
        <p className="label-text text-neutral text-sm font-bold">
          {t('page_settings_account')}
        </p>
        <div className="mt-2 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs">
            <AuthenticatorLogo type={AuthenticatorType.Telegram} className="size-6" />
            <span>{userName}</span>
          </div>
          <button className="btn btn-link btn-sm no-underline p-0" onClick={() => {
            navigate('/account-manage')
          }}>
            {t('page_settings_linkMore')}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="label-text text-neutral text-sm font-bold">
          {t('page_settings_security')}
        </p>
        <label className="mt-2 flex justify-between items-center">
          <button className="btn btn-link btn-sm !h-5 !min-h-5 no-underline p-0" onClick={() => {
            navigate('/change-password')
          }}>
            {t('page_settings_changePassword')}
          </button>
          <SvgGo className="size-5" />
        </label>
      </div>

      <div className="mt-6">
        <p className="label-text text-neutral text-sm font-bold">
          {t('page_settings_developerMode')}
        </p>
        <label className="mt-2 flex justify-between items-center">
          <span className="text-sm">{t('page_settings_devModeField')}</span>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm rounded-full"
            checked={hibitIdSession.config.devMode}
            onChange={(e) => {
              hibitIdSession.setDevMode(e.target.checked)
            }}
          />
        </label>
      </div>
    </div>
  )
})

export default SettingsPage;
