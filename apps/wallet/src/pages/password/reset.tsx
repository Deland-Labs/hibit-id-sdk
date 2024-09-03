import { FC, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { object, string, ref } from 'yup'
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup"
import PasswordWarnings from "./warning";
import { observer } from "mobx-react";
import { useMutation } from "@tanstack/react-query";
import toaster from "../../components/Toaster";
import LoaderButton from "../../components/LoaderButton";
import hibitIdSession from "../../stores/session";
import { getErrorMessage, HibitIDError, HibitIDErrorCode } from "../../utils/error-code";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/PageHeader";

const formSchema = object({
  password: string()
    .required('Password is required'),
  newPassword: string()
    .min(8, 'Password must be at least 8 characters')
    .required('New password is required'),
  confirmNewPassword: string()
    .oneOf([ref('newPassword'), ''], 'Passwords must match')
    .required('Confirm password is required'),
})

const ResetPasswordPage: FC = observer(() => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    setError,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
    resolver: yupResolver(formSchema),
  })

  useEffect(() => {
    if (errors.password) {
      errors.password.ref?.scrollIntoView?.({ behavior: 'smooth' })
    } else if (errors.newPassword) {
      errors.newPassword.ref?.scrollIntoView?.({ behavior: 'smooth' })
    } else if (errors.confirmNewPassword) {
      errors.confirmNewPassword.ref?.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [errors])

  const submitMutation = useMutation({
    mutationFn: async ({ oldPassword, newPassword }: {
      oldPassword: string
      newPassword: string
    }) => {
      try {
        await hibitIdSession.updatePassword(oldPassword, newPassword)
        toaster.success('Password changed')
        navigate('/')
      } catch (e) {
        if (e instanceof HibitIDError && e.code === HibitIDErrorCode.INVALID_PASSWORD) {
          setError('password', { message: 'Password incorrect' })
        } else {
          toaster.error(getErrorMessage(e, t))
        }
      }
    }
  })

  const handleConfirm = handleSubmit(async (values) => {
    await submitMutation.mutateAsync({
      oldPassword: values.password,
      newPassword: values.newPassword
    })
  })

  return (
    <div className="h-full px-6 pb-14 overflow-auto">
      <PageHeader title="Change Wallet Password" />
      <form className="mt-4 flex flex-col gap-5" onSubmit={handleConfirm}>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">Password</span>
            </div>
            <input
              {...register('password')}
              className="input input-sm w-full h-8 text-xs"
              type="password"
              autoFocus
            />
            {errors.password && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.password.message}</span>
              </div>
            )}
          </label>
        </div>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">New Password</span>
            </div>
            <input
              {...register('newPassword')}
              className="input input-sm w-full h-8 text-xs"
              type="password"
            />
            {errors.newPassword && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.newPassword.message}</span>
              </div>
            )}
          </label>
        </div>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">Confirm Password</span>
            </div>
            <input
              {...register('confirmNewPassword')}
              className="input input-sm w-full h-8 text-xs"
              type="password"
            />
            {errors.confirmNewPassword && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.confirmNewPassword.message}</span>
              </div>
            )}
          </label>
        </div>

        <PasswordWarnings />

        <div className="w-full p-6 pt-4 absolute left-0 bottom-0 bg-base-200">
          <LoaderButton
            className="btn btn-block btn-sm"
            loading={submitMutation.isPending}
            type="submit"
          >
            Confirm
          </LoaderButton>
        </div>
      </form>
    </div>
  )
})

export default ResetPasswordPage;
