import { observer } from "mobx-react";
import { FC, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthenticatorLogo from "../../components/AuthenticatorLogo";
import hibitIdSession from "../../stores/session";
import PageHeader from "../../components/PageHeader";
import SvgGo from '../../assets/right-arrow.svg?react'
import { languages } from "../../utils/lang";
import { useUserLoginsQuery } from "../../apis/react-query/auth";
import { authProviderTypeMap } from "../../utils/auth";

const SettingsPage: FC = observer(() => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const userLoginsQuery = useUserLoginsQuery()

  const loginInfo = useMemo(() => {
    if (!userLoginsQuery.data?.length) {
      return null
    }
    return userLoginsQuery.data[0]
  }, [userLoginsQuery.data])

  return (
    <div className="h-full px-6 overflow-auto">
      <PageHeader title={t('page_settings_title')} />

      <div className="mt-6">
        <p className="label-text text-neutral text-sm font-bold">
          {t('page_settings_account')}
        </p>
        <div className="mt-2 flex justify-between items-center">
          {!loginInfo ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <AuthenticatorLogo type={authProviderTypeMap[loginInfo.loginProvider]} className="size-6" />
              <span>{loginInfo.userDisplayName}</span>
            </div>
          )}
          {/* // TODO: TEMP HIDE */}
          {/* <button className="btn btn-link btn-sm no-underline p-0" onClick={() => {
            navigate('/account-manage')
          }}>
            {t('page_settings_linkMore')}
          </button> */}
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

      <div className="mt-6">
        <p className="label-text text-neutral text-sm font-bold">
          {t('page_settings_language')}
        </p>
        <label className="mt-2 flex justify-between items-center">
          <button className="btn btn-link btn-sm !h-5 !min-h-5 no-underline p-0" onClick={() => {
            navigate('/lang-select')
          }}>
            {languages[hibitIdSession.config.lang]}
          </button>
          <SvgGo className="size-5" />
        </label>
      </div>
    </div>
  )
})

export default SettingsPage;
