import { FC, useMemo } from "react";
import { useIsDesktop } from "../../utils/hooks";
import rpcManager from "../../utils/rpc";
import Modal from "../../components/Modal";
import SvgLogo from '../../assets/logo.svg?react';
import { AuthManager } from "../../utils/auth";
import AuthenticatorButton from "../../components/AuthenticatorButton";

const LoginPage: FC = () => {
  const isDesktop = useIsDesktop()

  const loginContent = useMemo(() => (
    <div className="h-full flex flex-col items-center py-4">
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="flex justify-center items-center size-20 rounded-full [background:linear-gradient(180deg,#16D6FF_0%,#0099E6_100%)]">
          <SvgLogo className="size-9" />
        </div>
        <h1 className="mt-6 text-neutral">Hibit ID</h1>
        <p className="mt-2 font-bold text-xl">
          Link <span className="text-primary">Web2</span> to <span className="text-primary">Web3</span> world
        </p>
      </div>
      <div className="w-full flex-none flex flex-col gap-4 items-center">
        <p className="text-neutral text-xs">Login By</p>
        <div className="flex items-center gap-8">
          {AuthManager.supportedAuthenticators.map((type) => (
            <AuthenticatorButton key={type} type={type} />
          ))}
        </div>
      </div>
    </div>
  ), [])

  return isDesktop ? (
    <Modal
      visible
      title="Hibit ID"
      onClose={() => rpcManager.onClose()}
      content={loginContent}
      modalClassName="w-[480px]"
    />
  ) : (
    <div className="h-full">
      {loginContent}
    </div>
  );
}

export default LoginPage;
