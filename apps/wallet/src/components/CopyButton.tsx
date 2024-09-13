import { forwardRef, HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import SvgCopy from '../assets/copy.svg?react';
import toaster from "./Toaster";
import { copyToClipboard } from "../utils/tool";
import { useTranslation } from "react-i18next";

export interface CopyButtonProps extends HTMLAttributes<HTMLButtonElement> {
  copyText: string
}

const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(({ copyText, className, ...props }, ref) => {
  const { t } = useTranslation()

  return (
    <button
      ref={ref}
      className={twMerge('btn btn-ghost btn-xs btn-square p-0', className)}
      {...props}
      onClick={() => {
        copyToClipboard(copyText ?? '').then(() => {
          toaster.success(t('common_copySuccess'))
        }).catch((e) => {
          console.error('[copy]', e)
          toaster.error(t('common_copyFailed'))
        })
      }}
    >
      <SvgCopy className="size-full" />
    </button>
  )
})

export default CopyButton;
