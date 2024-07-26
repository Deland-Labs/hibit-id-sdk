import { ButtonHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export interface LoaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

const LoaderButton = forwardRef<HTMLButtonElement, LoaderButtonProps>(({ loading, disabled, className, children, ...props }, ref) => {
  return (
    <button ref={ref} className={twMerge('btn', className)} disabled={loading || disabled} {...props}>
      {loading ? (
        <span className="loading loading-spinner loading-sm"></span>
      ) : children}
    </button>
  )
})

export default LoaderButton;
