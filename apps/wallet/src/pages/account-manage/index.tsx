import { FC } from "react";
import SvgGo from '../../assets/right-arrow.svg?react'
import SvgTrash from '../../assets/trash.svg?react'
import { useNavigate } from "react-router-dom";
import AuthenticatorLogo from "../../components/AuthenticatorLogo";
import { AuthenticatorType } from "sdk";
import { useTranslation } from "react-i18next";
import hibitIdSession from "../../stores/session";

const AccountManagePage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="h-full relative">
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-square btn-sm items-center" onClick={() => navigate(-1)}>
          <SvgGo className="size-6 rotate-180" />
        </button>
        <span className="text-xs">{t('page_account_title')}</span>
      </div>
      {/* // TODO: add more auth parties */}
      {/* <div className="mt-6">

      </div> */}
      <div className="mt-6">
        <p className="label-text text-neutral text-xs">{t('page_account_linked')}</p>
        <ul className="mt-4">
          <li className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <AuthenticatorLogo type={AuthenticatorType.Telegram} className="size-6" />
              <span className="text-xs">{hibitIdSession.auth?.name}</span>
            </div>
            <button className="btn btn-ghost btn-square btn-sm">
              <SvgTrash />
            </button>
          </li>
        </ul>
      </div>

      <button
        className="btn btn-block btn-sm absolute bottom-0"
        onClick={() => navigate('/')}
      >
        Confirm
      </button>
    </div>
  )
}

export default AccountManagePage;