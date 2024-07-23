import { FC } from "react";
import ResetPasswordPage from "./reset";
import CreatePasswordPage from "./create";
import { observer } from "mobx-react";

const PasswordPage: FC<{ isReset: boolean }> = observer(({ isReset }) => {
  return isReset ? (
    <ResetPasswordPage />
  ) : (
    <CreatePasswordPage />
  )
})

export default PasswordPage;
