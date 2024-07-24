import { Id, toast, ToastOptions } from "react-toastify";
import HibitToast, { HibitToastProps } from "./Toast";

const toaster = (props: HibitToastProps, options?: ToastOptions<HibitToastProps>): Id => {
  return toast(<HibitToast {...props} />, { ...options });
}

toaster.success = (text: string, options?: ToastOptions<HibitToastProps>): Id => {
  return toast.success(<HibitToast type="success" text={text} />, { ...options });
}

toaster.error = (text: string, options?: ToastOptions<HibitToastProps>): Id => {
  return toast.error(<HibitToast type="error" text={text} />, { ...options });
}

export default toaster;
