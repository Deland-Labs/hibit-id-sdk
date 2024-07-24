import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.min.css'
import SvgSuccess from '../../assets/green-check.svg?react'
import SvgError from '../../assets/red-exclamation.svg?react'
import SvgClose from '../../assets/close.svg?react'
import { FC } from 'react'

const HibitToastContainer: FC = () => {
  return (
    <ToastContainer
      position='top-center'
      autoClose={3000}
      hideProgressBar
      icon={(props) => {
        if (props.type === 'success') {
          return <SvgSuccess />
        }
        if (props.type === 'error') {
          return <SvgError />
        }
        return false
      }}
      closeButton={(props) => {
        return (
          <button className="btn btn-ghost btn-sm p-0 !bg-transparent" onClick={props.closeToast}>
            <SvgClose className="size-5" />
          </button>
        )
      }}
      toastClassName="!py-0 !items-center !min-h-[50px] !px-5 !bg-[#3E537C] !rounded-lg"
      bodyClassName="!m-0 !p-0"
    />
  )
}

export default HibitToastContainer
