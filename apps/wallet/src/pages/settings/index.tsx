import { observer } from "mobx-react";
import { FC } from "react";
import SvgGo from '../../assets/right-arrow.svg?react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SettingsPage: FC = observer(() => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="h-full relative">
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-square btn-sm items-center" onClick={() => navigate(-1)}>
          <SvgGo className="size-6 rotate-180" />
        </button>
        <span className="text-xs">{t('page_settings_title')}</span>
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
