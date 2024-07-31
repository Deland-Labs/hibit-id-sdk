import { FC } from "react";
import ResetPasswordPage from "./reset";
import CreatePasswordPage from "./create";
import { observer } from "mobx-react";
import VerifyPasswordPage from "./verify";

const PasswordPage: FC<{ type: 'verify' | 'create' | 'change' }> = observer(({ type }) => {
  if (type === 'verify') {
    return <VerifyPasswordPage />
  }
  if (type === 'create') {
    return <CreatePasswordPage />
  }
  return <ResetPasswordPage />
})

export default PasswordPage;
