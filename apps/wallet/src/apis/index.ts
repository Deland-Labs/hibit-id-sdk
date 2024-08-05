import { QueryClient } from '@tanstack/react-query';
import hibitIdSession from '../stores/session';
import axios, { AxiosRequestConfig } from 'axios';
import { AuthServerErrorResponse } from './models';
import toaster from '../components/Toaster';
import { prOidc } from '../utils/oidc';

export const queryClient = new QueryClient();

interface ServiceRequestConfig<T> extends AxiosRequestConfig {
  method: 'GET' | 'POST';
  data?: T;
}

const ex3ApiRequest = axios.create({
  baseURL: import.meta.env.VITE_EX3_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const authApiRequest = axios.create({
  baseURL: import.meta.env.VITE_HIBIT_ID_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});
authApiRequest.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      hibitIdSession.disconnect();
      toaster.error('User unauthorized, please login again');
    } else {
      toaster.error(`[${error.response?.status}] ${error.response?.data?.error?.message || error.message}`);
    }
    return Promise.reject(error);
  }
);

export const ex3ServiceClient = async <D>(config: ServiceRequestConfig<D>) => {
  const { method = 'GET' } = config;
  if (method === 'GET') config.params = config.data;
  const res = await ex3ApiRequest.request(config);
  return JSON.stringify(res.data);
};

export const authServiceClient = async <D>(config: ServiceRequestConfig<D>) => {
  const { method = 'GET' } = config;
  if (method === 'GET') config.params = config.data;
  const res = await authApiRequest.request(config);
  return JSON.stringify(res.data);
};

export const sendEx3UnSignedRequest = async <TInput>(
  input: TInput,
  url: string
): Promise<string> => {
  return await ex3ServiceClient<TInput>({
    url: url,
    method: 'POST',
    data: input
  });
};

export const sendApiRequest = async <TInput, TOutput>(
  input: TInput,
  url: string,
  method: 'GET' | 'POST' = 'POST',
  auth = true
): Promise<TOutput> => {
  const oidc = await prOidc;
  if (auth && !oidc.isUserLoggedIn) {
    throw new Error('No auth session');
  }
  let headers = {};
  if (auth) {
    headers = {
      'Authorization': `Bearer ${oidc.getTokens().idToken}`
    };
  }
  const res = await authServiceClient<TInput>({
    url: url,
    method,
    data: input,
    headers: headers
  });
  try {
    const resultData = JSON.parse(res);
    if (resultData.error) {
      throw new Error((resultData as AuthServerErrorResponse).error.message);
    }
    return resultData as TOutput;
  } catch (e) {
    throw new Error('Malformed response');
  }
};
