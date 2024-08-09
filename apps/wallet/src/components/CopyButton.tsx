import { forwardRef, HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import SvgCopy from '../assets/copy.svg?react';
import toaster from "./Toaster";
import { copyToClipboard } from "../utils/tool";

export interface CopyButtonProps extends HTMLAttributes<HTMLButtonElement> {
  copyText: string
}

const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(({ copyText, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={twMerge('btn btn-ghost btn-xs btn-square p-0', className)}
      {...props}
      onClick={() => {
        copyToClipboard(copyText ?? '').then(() => {
          toaster.success('Copy Success')
        }).catch((e) => {
          console.error('[copy]', e)
          toaster.error('Copy Failed')
        })
      }}
    >
      <SvgCopy className="size-full" />
    </button>
  )
})

export default CopyButton;
