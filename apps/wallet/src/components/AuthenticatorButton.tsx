import { FC } from "react";
import { AuthenticatorType } from "sdk";
import { observer } from "mobx-react";
import authManager from "../utils/auth";
import AuthenticatorLogo from "./AuthenticatorLogo";

export interface AuthenticatorButtonProps {
  type: AuthenticatorType
  onSuccess?: () => void
}

const AuthenticatorButton: FC<AuthenticatorButtonProps> = observer(({ type, onSuccess }) => {
  const handleAuth = async () => {
    await authManager.login(type)
    onSuccess?.()
  }

  return (
    <button
      className="btn btn-circle btn-sm size-8 border-none"
      onClick={handleAuth}
    >
      <AuthenticatorLogo type={type} className="size-8" />
    </button>
  )
})

export default AuthenticatorButton
