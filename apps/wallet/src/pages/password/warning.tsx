import { FC } from "react";
import { useTranslation } from "react-i18next";

const PasswordWarnings: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6 text-neutral text-xs">
      <p>{`* ${t('page_password_info')}`}</p>
    </div>
  )
}

export default PasswordWarnings;
