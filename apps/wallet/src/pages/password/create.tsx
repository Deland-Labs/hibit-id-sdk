import { FC } from "react";
import { useNavigate } from "react-router-dom";
import { object, string, ref } from 'yup'
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup"
import PasswordWarnings from "./warning";
import { observer } from "mobx-react";
import LoaderButton from "../../components/LoaderButton";
import toaster from "../../components/Toaster";
import { CreateMnemonicInput } from "../../apis/models";
import { AES, MD5 } from 'crypto-js'
import { HDNodeWallet } from "ethers";
import hibitIdSession from "../../stores/session";
import { useMutation } from "@tanstack/react-query";
import {CreateMnemonicAsync, MnemonicManager, MnemonicVersion} from "../../apis/services/auth";
import LogoSection from "../../components/LogoSection";

const formSchema = object({
  password: string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: string()
    .oneOf([ref('password'), ''], 'Passwords must match')
    .required('Confirm password is required'),
})

const CreatePasswordPage: FC = observer(() => {
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
    <div className="h-full px-6 overflow-auto">
      <LogoSection />
      <div className="mt-6 text-center text-xs">
        Set wallet password
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

        <LoaderButton
          className="btn btn-block btn-sm"
          loading={submitMutation.isPending}
          type="submit"
        >
          Confirm
        </LoaderButton>

        <PasswordWarnings />
      </form>
    </div>
  )
})

export default CreatePasswordPage;
