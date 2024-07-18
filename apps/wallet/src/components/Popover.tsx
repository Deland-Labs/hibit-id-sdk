import { FC, PropsWithChildren, ReactNode, useCallback, useRef, useState } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useDismiss,
  useRole,
  useClick,
  useInteractions,
  FloatingFocusManager,
  useId,
  FloatingPortal,
  Placement
} from '@floating-ui/react'

export interface PopoverProps {
  content: ReactNode | ((close: () => void) => ReactNode)
  onClose?: () => void
  placement?: Placement
  disabled?: boolean
}

const Popover: FC<PropsWithChildren<PopoverProps>> = ({
  content,
  onClose,
  placement,
  disabled,
  children
}) => {
  const [open, setOpen] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (disabled) {
        return
      }
      setOpen(value)
      if (!value) {
        onCloseRef.current?.()
      }
    },
    [disabled]
  )

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  const { refs, floatingStyles, context } = useFloating({
    open: open,
    onOpenChange: handleOpenChange,
    middleware: [offset(8), flip({ fallbackAxisSideDirection: 'end' }), shift()],
    placement: placement || 'bottom',
    whileElementsMounted: autoUpdate
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context)

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

  const headingId = useId()

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              className="w-max z-10"
              ref={refs.setFloating}
              style={floatingStyles}
              aria-labelledby={headingId}
              {...getFloatingProps()}
            >
              {typeof content === 'function' ? content(handleClose) : content}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  )
}

export default Popover
