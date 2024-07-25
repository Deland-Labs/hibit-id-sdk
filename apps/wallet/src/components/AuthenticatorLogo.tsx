import { FC, SVGProps } from "react";
import { AuthenticatorType } from "sdk";
import UnknownSvg from '../assets/auth-logos/UNKNOWN.svg?react';
import TelegramSvg from '../assets/auth-logos/Telegram.svg?react';

const AuthenticatorLogo: FC<SVGProps<SVGSVGElement> & {
  title?: string;
  type: AuthenticatorType
}> = ({ type, ...props }) => {
  switch (type) {
    case AuthenticatorType.Telegram: {
      return <TelegramSvg {...props} />
    }
    default: {
      return <UnknownSvg {...props} />
    }
  }
}

export default AuthenticatorLogo;
