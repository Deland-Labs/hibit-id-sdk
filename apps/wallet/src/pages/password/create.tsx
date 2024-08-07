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

const formSchema = object({
  password: string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: string()
    .oneOf([ref('password'), ''], 'Passwords must match')
    .required('Confirm password is required'),
})

const CreatePasswordPage: FC = observer(() => {
  const { t } = useTranslation()
  const navigate = useNavigate()
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
      await hibitIdSession.connect(pwd)
      navigate('/')
    }
  })

  const handleConfirm = handleSubmit(async (values) => {
    await submitMutation.mutateAsync(values.password)
  })

  return (
    <div className="h-full px-6 pb-14 overflow-auto">
      <div className="text-xs">
        Set wallet password
      </div>
      <div className="mt-6">
        <LogoSection />
      </div>
      <div className="p-2 mt-6 rounded-lg bg-warning/15 text-warning text-xs">
        {t('page_password_create_warn')}
      </div>
      <form className="mt-4 flex flex-col gap-6" onSubmit={handleConfirm}>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-xs">Wallet Password</span>
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
              <span className="label-text text-neutral text-xs">Confirm Wallet Password</span>
            </div>
            <input
              {...register('confirmPassword')}
              className="input input-sm w-full h-8 text-xs"
              type="password"
            />
            {errors.confirmPassword && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
              </div>
            )}
          </label>
        </div>

        <PasswordWarnings />

        <div className="w-full p-6 pt-4 fixed left-0 bottom-0 bg-base-200">
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

export default CreatePasswordPage;
