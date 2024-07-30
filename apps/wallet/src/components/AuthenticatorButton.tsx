import { FC } from "react";
import { AuthenticatorType } from "@deland-labs/hibit-id-sdk";
import { observer } from "mobx-react";
import authManager from "../utils/auth";
import AuthenticatorLogo from "./AuthenticatorLogo";
import toaster from "./Toaster";

export interface AuthenticatorButtonProps {
  type: AuthenticatorType
  onSuccess?: () => void
}

const AuthenticatorButton: FC<AuthenticatorButtonProps> = observer(({ type, onSuccess }) => {
  const handleAuth = async () => {
    try {
      await authManager.login(type)
      onSuccess?.()
    } catch (e) {
      console.error(e)
      toaster.error(e instanceof Error ? e.message : `${AuthenticatorType[type]} login failed`)
    }
  }

  return (
    <button
      className="btn btn-circle btn-sm size-8 border-none"
      title={AuthenticatorType[type]}
      onClick={handleAuth}
    >
      <AuthenticatorLogo type={type} className="size-8" />
    </button>
  )
})

export default AuthenticatorButton
