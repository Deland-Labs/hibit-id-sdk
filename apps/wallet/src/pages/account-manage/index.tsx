import { FC } from "react";
import SvgTrash from '../../assets/trash.svg?react'
import { useNavigate } from "react-router-dom";
import AuthenticatorLogo from "../../components/AuthenticatorLogo";
import { AuthenticatorType } from "@deland-labs/hibit-id-sdk";
import { useTranslation } from "react-i18next";
import { useUserLoginsQuery } from "../../apis/react-query/auth";
import PageHeader from "../../components/PageHeader";

const authProviderLogoMap: Record<string, AuthenticatorType> = {
  'telegram': AuthenticatorType.Telegram
}

const AccountManagePage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userLoginsQuery = useUserLoginsQuery()

  return (
    <div className="h-full px-6 flex flex-col gap-6 overflow-auto">
      <PageHeader title={t('page_account_title')} />
      {/* // TODO: add more auth parties */}
      {/* <div className="mt-6">

      </div> */}
      <div className="flex-1">
        <p className="label-text text-neutral text-sm font-bold">{t('page_account_linked')}</p>
        <ul className="mt-4">
          {userLoginsQuery.data?.map((login) => (
            <li className="flex justify-between items-center" key={login.loginProvider}>
              <div className="flex items-center gap-4">
                <AuthenticatorLogo type={authProviderLogoMap[login.loginProvider]} className="size-6" />
                <span className="text-xs">{login.providerKey}</span>
              </div>
              {/* // TODO: delete api */}
              {userLoginsQuery.data?.length > 1 && (
                <button className="btn btn-ghost btn-square btn-sm">
                  <SvgTrash />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <button
        className="btn btn-block btn-sm"
        onClick={() => navigate('/')}
      >
        Confirm
      </button>
    </div>
  )
}

export default AccountManagePage;
