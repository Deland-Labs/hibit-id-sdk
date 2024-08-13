import { AuthParty, HibitEnv } from "./types";

export const getSupportedAuthParties = (env: HibitEnv): AuthParty[] => {
  const url = getHibitIdUrl(env)
  // TODO: grow this list
  return [
    {
      key: 'telegram',
      name: 'Telegram',
      icon: `${url}/auth-icons/Telegram.svg`,
    }
  ]
}

export const getHibitIdUrl = (env: HibitEnv) => {
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
  return url
}

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}
