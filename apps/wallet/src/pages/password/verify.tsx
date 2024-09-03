import { FC, useEffect } from "react";
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
import LogoSection from "../../components/LogoSection";
import authManager from "../../utils/auth";
import { useUserLoginsQuery } from "../../apis/react-query/auth";
import { useOidc } from "../../utils/oidc";
import { IS_TELEGRAM_MINI_APP, RUNTIME_ENV } from "../../utils/runtime";
import { RuntimeEnv } from "../../utils/basicEnums";
import rpcManager from "../../stores/rpc";
import PageHeader from "../../components/PageHeader";

const formSchema = object({
  password: string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
})

const VerifyPasswordPage: FC = observer(() => {
  const navigate = useNavigate()
  const { isUserLoggedIn } = useOidc()
  const userLoginsQuery = useUserLoginsQuery()
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
    }
  }, [errors])

  const submitMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!hibitIdSession.userId) {
        toaster.error('User not found')
        return
      }
      const pwd = MD5(`${password}${hibitIdSession.userId}`).toString()
      try {
        await hibitIdSession.unlock(pwd)
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
    <div className="h-full px-6 pb-14 overflow-auto">
      <PageHeader title="Unlock wallet" backable={false} />
      <div className="mt-4">
        <LogoSection />
      </div>
      {(isUserLoggedIn && !IS_TELEGRAM_MINI_APP) && (
        <div className="text-xs mt-4">
          <span>Wallet authenticated via {userLoginsQuery.data?.[0]?.providerDisplayName ?? '--'}</span>
          <button
            className="btn btn-link btn-xs p-0 outline-none"
            onClick={() => {
              if (RUNTIME_ENV === RuntimeEnv.SDK) {
                rpcManager.beginActiveDisconnect()
              }
              authManager.logout()
            }}
          >
            [logout]
          </button>
        </div>
      )}
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

        <PasswordWarnings />

        <div className="w-full p-6 pt-4 absolute left-0 bottom-0 bg-base-200">
          <LoaderButton
            className="btn btn-block btn-sm"
            type="submit"
            loading={submitMutation.isPending}
          >
            Unlock
          </LoaderButton>
        </div>
      </form>
    </div>
  )
})

export default VerifyPasswordPage;
