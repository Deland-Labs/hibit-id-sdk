import { useClickAway } from 'ahooks'
import { FC, HTMLAttributes, ReactNode, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

export interface CommonDropdownProps extends HTMLAttributes<HTMLDetailsElement> {
  triggerContent: ReactNode
  dropdownContent: ReactNode | ((close: () => void) => ReactNode)
  triggerProps?: HTMLAttributes<HTMLElement>
  disabled?: boolean
  disableBackdropClose?: boolean
  onClose?: () => void
}

const Dropdown: FC<CommonDropdownProps> = ({
  triggerContent,
  triggerProps,
  dropdownContent,
  disabled,
  disableBackdropClose,
  onClose,
  className,
  ...otherProps
}) => {
  const { className: triggerClassname, ...otherTriggerProps } = triggerProps ?? {}
  const detailsRef = useRef<HTMLDetailsElement>(null)

  const closeDropdown = (): void => {
    if (!detailsRef.current?.hasAttribute('open')) {
      return
    }
    onClose?.()
    detailsRef.current?.removeAttribute('open')
  }

  useClickAway(() => {
    if (!disableBackdropClose) {
      closeDropdown()
    }
  }, detailsRef)

  return (
    <details
      ref={detailsRef}
      className={twMerge(
        'block dropdown',
        disabled && 'cursor-not-allowed',
        className
      )}
      aria-disabled={disabled}
      {...otherProps}
    >
      <summary
        className={twMerge(
          'btn btn-sm min-w-max border-none',
          disabled && 'btn-disabled',
          triggerClassname
        )}
        {...otherTriggerProps}
      >
        {triggerContent}
      </summary>
      <div className="mt-1 dropdown-content z-[1] rounded-box">
        {typeof dropdownContent === 'function' ? dropdownContent(closeDropdown) : dropdownContent}
      </div>
    </details>
  )
}

export default Dropdown
