import { useQuery } from "@tanstack/react-query";
import { QueryCacheKey } from "./query-keys";
import { GetUserLoginsAsync } from "../services/auth";
import { useOidc } from "../../utils/oidc";

export const useUserLoginsQuery = () => {
  const { isUserLoggedIn } = useOidc()

  return useQuery({
    queryKey: [QueryCacheKey.GET_USER_LOGINS],
    queryFn: async () => {
      const res = await GetUserLoginsAsync()
      return res
    },
    enabled: isUserLoggedIn,
  })
}
