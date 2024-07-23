import { FC } from "react";
import { useTranslation } from "react-i18next";

const PasswordWarnings: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6 text-neutral text-xs">
      <p>{`* ${t('page_password_warning1')}`}</p>
      <p>{`* ${t('page_password_warning2')}`}</p>
      <p>{`* ${t('page_password_warning3')}`}</p>
    </div>
  )
}

export default PasswordWarnings;
