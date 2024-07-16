import { SDK_AUTH_PARAM_KEY } from "./constants";
import { HibitEnv, HibitIdPage, UserAuthInfo } from "./types";
import { Buffer } from 'buffer'

export const getHibitIdUrl = (env: HibitEnv, auth: UserAuthInfo | null, initialPage: HibitIdPage) => {
  let url = '';
  switch (env) {
    case 'dev': {
      url = import.meta.env.VITE_HIBIT_ID_DEV_URL
      break
    }
    case 'test': {
      url = import.meta.env.VITE_HIBIT_ID_TEST_URL
      break
    }
    case 'prod': {
      url = import.meta.env.VITE_HIBIT_ID_PROD_URL
      break
    }
  }
  const authQuery = auth ? `?${SDK_AUTH_PARAM_KEY}=${Buffer.from(JSON.stringify(auth), 'utf-8').toString('hex')}` : ''
  url = `${url}/${initialPage === 'login' ? 'login' : ''}${authQuery}`
  return url
}
