import { FC, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { object, string, ref } from 'yup'
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup"
import PasswordWarnings from "./warning";
import { observer } from "mobx-react";
import LoaderButton from "../../components/LoaderButton";
import toaster from "../../components/Toaster";
import { AES, MD5 } from 'crypto-js'
import { HDNodeWallet } from "ethers";
import hibitIdSession from "../../stores/session";
import { useMutation } from "@tanstack/react-query";
import {MnemonicManager} from "../../apis/services/auth";
import LogoSection from "../../components/LogoSection";
import { useTranslation } from "react-i18next";
import PasswordInput from "../../components/PasswordInput";


const CreatePasswordPage: FC = observer(() => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const formSchema = object({
    password: string()
      .min(8, t('page_password_errorPwdCharNumber'))
      .required(t('page_password_errorPwdRequired')),
    confirmPassword: string()
      .oneOf([ref('password'), ''], t('page_password_errorPwdMatch'))
      .required(t('page_password_errorConfirmPwdRequired')),
  })
  const {
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
    } else if (errors.confirmPassword) {
      errors.confirmPassword.ref?.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [errors])

  const submitMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!hibitIdSession.userId) {
        toaster.error('User not found')
        return
      }
      const pwd = MD5(`${password}${hibitIdSession.userId}`).toString()
      const phrase = HDNodeWallet.createRandom().mnemonic!.phrase
      const encryptedPhrase = AES.encrypt(phrase, pwd).toString()
      await MnemonicManager.instance.createAsync(encryptedPhrase)
      await hibitIdSession.fetchMnemonic()
      await hibitIdSession.unlock(pwd)
      navigate('/')
    }
  })

  const handleConfirm = handleSubmit(async (values) => {
    await submitMutation.mutateAsync(values.password)
  })

  return (
    <div className="h-full px-6 pb-14 overflow-auto">
      <LogoSection />
      <div className="p-2 mt-6 rounded-lg bg-warning/15 text-warning text-xs">
        {t('page_password_create_warn')}
      </div>
      <form className="mt-4 flex flex-col gap-5" onSubmit={handleConfirm}>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">
                {t('page_password_setPassword')}
              </span>
            </div>
            <PasswordInput {...register('password')} autoFocus />
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
              <span className="label-text text-neutral text-sm font-bold">
                {t('page_password_confirmPassword')}
              </span>
            </div>
            <PasswordInput {...register('confirmPassword')} />
            {errors.confirmPassword && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
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
            {t('common_confirm')}
          </LoaderButton>
        </div>
      </form>
    </div>
  )
})

export default CreatePasswordPage;
