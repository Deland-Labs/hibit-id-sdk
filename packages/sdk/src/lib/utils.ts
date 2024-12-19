import { HibitIdAssetType, HibitIdChainId } from "./enums";
import { AuthParty, GetBalanceRequest, HibitEnv } from "./types";

export const getSupportedAuthParties = (env: HibitEnv): AuthParty[] => {
  const url = getHibitIdUrl(env)
  // TODO: grow this list
  return [
    {
      key: 'telegram',
      name: 'Telegram',
      icon: `${url}/auth-icons/Telegram.svg`,
    },
    {
      key: 'google',
      name: 'Google',
      icon: `${url}/auth-icons/Google.svg`,
    },
    {
      key: 'x',
      name: 'X',
      icon: `${url}/auth-icons/X.svg`,
    },
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

export const stringifyBalanceRequest = (request: GetBalanceRequest): string => {
  return `${request.chainId ?? ''}|${request.assetType ?? ''}|${request.decimalPlaces ?? ''}|${request.contractAddress ?? ''}`
}

export const parseBalanceRequest = (request: string): GetBalanceRequest => {
  const [chainId, assetType, decimalPlaces, contractAddress] = request.split('|')
  return {
    chainId: chainId !== '' ? chainId as HibitIdChainId : undefined,
    assetType: assetType !== '' ? Number(assetType) as HibitIdAssetType : undefined,
    decimalPlaces: decimalPlaces !== '' ? Number(decimalPlaces) : undefined,
    contractAddress: contractAddress || undefined,
  }
}
