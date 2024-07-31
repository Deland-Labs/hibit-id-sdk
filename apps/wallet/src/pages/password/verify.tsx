import { FC } from "react";
import { useNavigate } from "react-router-dom";
import { object, string } from 'yup'
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup"
import PasswordWarnings from "./warning";
import { observer } from "mobx-react";
import LoaderButton from "../../components/LoaderButton";
import toaster from "../../components/Toaster";
import { MD5 } from 'crypto-js'
import hibitIdSession from "../../stores/session";
import { useMutation } from "@tanstack/react-query";
import { HibitIDError, HibitIDErrorCode } from "../../utils/error-code";

const formSchema = object({
  password: string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
})

const VerifyPasswordPage: FC = observer(() => {
  const navigate = useNavigate()
  const {
    setError,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
    resolver: yupResolver(formSchema),
  })

  const submitMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!hibitIdSession.userId) {
        toaster.error('User not found')
        return
      }
      const pwd = MD5(`${password}${hibitIdSession.userId}`).toString()
      try {
        await hibitIdSession.connect(pwd)
        navigate('/')
      } catch (e) {
        if (e instanceof HibitIDError && e.code === HibitIDErrorCode.INVALID_PASSWORD) {
          setError('password', {
            type: 'manual',
            message: 'Password is incorrect',
          })
        }
      }
    }
  })

  const handleConfirm = handleSubmit(async (values) => {
    await submitMutation.mutateAsync(values.password)
  })

  return (
    <div className="h-full relative">
      <div className="flex items-center gap-2">
        <span className="text-xs">Unlock Wallet</span>
      </div>
      <div className="mt-6">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-neutral text-xs">Wallet Password</span>
          </div>
          <input
            {...register('password')}
            className="input input-sm w-full h-8 text-xs"
            type="password"
          />
          {errors.password && (
            <div className="label">
              <span className="label-text-alt text-error">{errors.password.message}</span>
            </div>
          )}
        </label>
      </div>
      <div className="mt-6">
        <PasswordWarnings />
      </div>

      <LoaderButton
        className="btn btn-block btn-sm absolute bottom-0"
        onClick={handleConfirm}
        loading={submitMutation.isPending}
      >
        Confirm
      </LoaderButton>
    </div>
  )
})

export default VerifyPasswordPage;
