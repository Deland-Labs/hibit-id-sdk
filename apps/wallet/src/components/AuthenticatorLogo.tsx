import { FC, SVGProps } from "react";
import { AuthenticatorType } from "@delandlabs/hibit-id-sdk";
import UnknownSvg from '../assets/auth-logos/UNKNOWN.svg?react';
import TelegramSvg from '../assets/auth-logos/Telegram.svg?react';
import GoogleSvg from '../assets/auth-logos/Google.svg?react'
import XSvg from '../assets/auth-logos/X.svg?react'

const AuthenticatorLogo: FC<SVGProps<SVGSVGElement> & {
  title?: string;
  type: AuthenticatorType
}> = ({ type, ...props }) => {
  switch (type) {
    case AuthenticatorType.Telegram: {
      return <TelegramSvg {...props} />
    }
    case AuthenticatorType.Google: {
      return <GoogleSvg {...props} />
    }
    case AuthenticatorType.X: {
      return <XSvg {...props} />
    }
    default: {
      return <UnknownSvg {...props} />
    }
  }
}

export default AuthenticatorLogo;
