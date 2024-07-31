import { observer } from "mobx-react";
import { FC, useEffect } from "react";
import PageLoading from "../../components/PageLoading";
import { useNavigate } from "react-router-dom";
import { useOidc } from "../../utils/oidc";

const OidcLoginPage: FC = observer(() => {
  const navigate = useNavigate()
  const { isUserLoggedIn } = useOidc()

  useEffect(() => {
    if (isUserLoggedIn) {
      navigate('/')
    }
    // } else {
    //   login({
    //     doesCurrentHrefRequiresAuth: false,
    //     redirectUrl: '/oidc-login'
    //   })
    // }
  }, [isUserLoggedIn])

  return (
    <PageLoading />
  )
})

export default OidcLoginPage;
