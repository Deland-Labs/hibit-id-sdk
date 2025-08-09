import { ChainAssetType, ChainId } from '@delandlabs/hibit-basic-types';
import { HibitIdSdkErrorCode } from '@delandlabs/coin-base';
import { AuthParty, GetBalanceRequest, HibitEnv, HibitIdError } from './types';

export const getSupportedAuthParties = (env: HibitEnv): AuthParty[] => {
  const url = getHibitIdUrl(env);
  // TODO: grow this list
  return [
    {
      key: 'telegram',
      name: 'Telegram',
      icon: `${url}/auth-icons/Telegram.svg`
    },
    {
      key: 'google',
      name: 'Google',
      icon: `${url}/auth-icons/Google.svg`
    },
    {
      key: 'x',
      name: 'X',
      icon: `${url}/auth-icons/X.svg`
    }
  ];
};

export const getHibitIdUrl = (env: HibitEnv) => {
  let url = '';
  switch (env) {
    case 'dev': {
      url = import.meta.env.VITE_HIBIT_ID_DEV_URL;
      break;
    }
    case 'test': {
      url = import.meta.env.VITE_HIBIT_ID_TEST_URL;
      break;
    }
    case 'prod': {
      url = import.meta.env.VITE_HIBIT_ID_PROD_URL;
      break;
    }
  }
  return url;
};

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const stringifyBalanceRequest = (request: GetBalanceRequest): string => {
  const chainIdStr = request.chainId ? request.chainId.toString() : '';
  return `${chainIdStr}|${request.assetType ?? ''}|${request.contractAddress ?? ''}`;
};

export const parseBalanceRequest = (request: string): GetBalanceRequest => {
  const [chainId, assetType, contractAddress] = request.split('|');

  if (!chainId || chainId === '') {
    throw new HibitIdError(
      HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
      'Invalid balance request: chainId is required'
    );
  }

  const parsedChainId = ChainId.fromString(chainId);
  if (!parsedChainId) {
    throw new HibitIdError(
      HibitIdSdkErrorCode.WALLET_NOT_CONNECTED,
      `Invalid chainId: ${chainId}`
    );
  }

  return {
    chainId: parsedChainId,
    assetType:
      assetType !== '' ? (Number(assetType) as ChainAssetType) : undefined,
    contractAddress: contractAddress || undefined
  };
};
