import { observer } from "mobx-react";
import { FC } from "react";
import SvgCheck from '../../assets/blue-check.svg?react'
import { useTranslation } from "react-i18next";
import hibitIdSession from "../../stores/session";
import PageHeader from "../../components/PageHeader";
import { Language, languages } from "../../utils/lang";
import { twMerge } from "tailwind-merge";

const SelectLangPage: FC = observer(() => {
  const { t } = useTranslation()

  return (
    <div className="h-full px-6 overflow-auto flex flex-col gap-6">
      <PageHeader title={t('page_lang_title')} />
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {Object.entries(languages).map(([code, name]) => (
          <li
            key={code}
            className={twMerge(
              "h-12 flex justify-between items-center",
              hibitIdSession.config.lang === code && "text-primary font-bold",
            )}
            onClick={() => {
              hibitIdSession.switchLanguage(code as Language)
            }}
            role="button"
          >
            <span>{name}</span>
            {hibitIdSession.config.lang === code && (
              <SvgCheck className="size-5 text-primary" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
})

export default SelectLangPage
