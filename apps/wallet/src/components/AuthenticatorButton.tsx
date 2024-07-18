import { FC, useMemo } from "react";
import { AuthenticatorType } from "../utils/auth/types";
import UnknownSvg from '../assets/auth-logos/UNKNOWN.svg?react';
import TelegramSvg from '../assets/auth-logos/Telegram.svg?react';
import { observer } from "mobx-react";
import authManager from "../utils/auth";

export interface AuthenticatorButtonProps {
  type: AuthenticatorType
  onSuccess?: () => void
}

const AuthenticatorButton: FC<AuthenticatorButtonProps> = observer(({ type, onSuccess }) => {
  const icon = useMemo(() => {
    switch (type) {
      case AuthenticatorType.Telegram: {
        return <TelegramSvg className="size-8" />
      }
      default: {
        return <UnknownSvg className="size-8" />
      }
    }
  }, [type])

  const handleAuth = async () => {
    await authManager.login(type)
    onSuccess?.()
  }

  return (
    <button
      className="btn btn-circle btn-sm size-8 border-none"
      onClick={handleAuth}
    >
      {icon}
    </button>
  )
})

export default AuthenticatorButton
