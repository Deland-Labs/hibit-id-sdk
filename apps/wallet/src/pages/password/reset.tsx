import { FC, useEffect } from "react";
import SvgGo from '../../assets/right-arrow.svg?react'
import { useNavigate } from "react-router-dom";
import { object, string, ref } from 'yup'
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup"
import PasswordWarnings from "./warning";
import { observer } from "mobx-react";
import { useMutation } from "@tanstack/react-query";
import toaster from "../../components/Toaster";
import LoaderButton from "../../components/LoaderButton";

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
    resolver: yupResolver(formSchema),
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      // TODO:
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true)
        }, 2000)
      })
    }
  })

  const handleConfirm = handleSubmit(async (values) => {
    await submitMutation.mutateAsync()
    toaster.success('Password changed')
    navigate('/')
  })

  return (
    <div className="h-full relative">
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-square btn-sm items-center" onClick={() => navigate(-1)}>
          <SvgGo className="size-6 rotate-180" />
        </button>
        <span className="text-xs">Change wallet password</span>
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
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-neutral text-xs">New Wallet Password</span>
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
      <div className="mt-6">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-neutral text-xs">Confirm Wallet Password</span>
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

export default ResetPasswordPage;
