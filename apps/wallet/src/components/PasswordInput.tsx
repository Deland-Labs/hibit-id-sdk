import { forwardRef, InputHTMLAttributes, useState } from "react";
import { twMerge } from "tailwind-merge";
import SvgEyeOpen from '../assets/eye-open.svg?react'
import SvgEyeClose from '../assets/eye-close.svg?react'

const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({
  className,
  style,
  ...rest
}, ref) => {
  const [show, setShow] = useState(false)
  return (
    <label className={twMerge("input input-sm h-8 text-xs flex items-center gap-2", className)} style={style}>
      <input type={show ? "text" : "password"} ref={ref} className="h-full grow appearance-none" {...rest} />
      {show ? (
        <SvgEyeClose className="size-4" onClick={() => setShow(false)} />
      ) : (
        <SvgEyeOpen className="size-4" onClick={() => setShow(true)} />
      )}
    </label>
  )
})

export default PasswordInput
