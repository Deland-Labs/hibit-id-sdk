import { FC, ReactNode, useEffect, useRef } from 'react'
import SvgClose from '../assets/close.svg?react'
import { twMerge } from 'tailwind-merge'

export interface ModalProps {
  visible: boolean
  title: string
  content: ReactNode | ((close: () => void) => ReactNode)
  onClose: () => void
  modalClassName?: string
}

const Modal: FC<ModalProps> = ({ visible, title, content, onClose, modalClassName }) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const handleOpen = (): void => {
    dialogRef.current?.showModal()
  }

  const handleClose = (): void => {
    dialogRef.current?.close()
  }

  useEffect(() => {
    if (visible) {
      handleOpen()
    } else {
      handleClose()
    }
  }, [visible])

  useEffect(() => {
    const ref = dialogRef.current
    const closeRef = onCloseRef.current
    ref?.addEventListener('close', closeRef)
    return () => {
      ref?.removeEventListener('close', closeRef)
    }
  }, [])

  return (
    <dialog ref={dialogRef} className="modal">
      <div className={twMerge('modal-box w-[600px] max-w-full px-4 py-0 flex flex-col bg-base-200', modalClassName)}>
        <div className="h-[56px] flex justify-between items-center border-b border-accent">
          <h3 className="text-lg">{title}</h3>
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button className="btn btn-ghost btn-square btn-xs">
              <SvgClose />
            </button>
          </form>
        </div>
        <div className='flex-1'>
          {typeof content === 'function' ? content(handleClose) : content}
        </div>
      </div>
    </dialog>
  )
}

export default Modal
