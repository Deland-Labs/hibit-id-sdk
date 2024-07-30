import { QueryClient } from "@tanstack/react-query";
import hibitIdSession from "../stores/session";
import axios, { AxiosRequestConfig } from 'axios';

export const queryClient = new QueryClient()

interface ServiceRequestConfig<T> extends AxiosRequestConfig {
  method: 'GET' | 'POST';
  data?: T;
}

const ex3ApiRequest = axios.create({
  baseURL: import.meta.env.VITE_HIBIT_ID_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ex3ServiceClient = async <D>(config: ServiceRequestConfig<D>) => {
  const { method = 'GET' } = config;
  if (method === 'GET') config.params = config.data;
  const res = await ex3ApiRequest.request(config);
  return JSON.stringify(res.data)
};

export const sendEx3WalletRequest = async <TInput>(
  input: TInput,
  url: string
): Promise<string> => {
  let dataStr = '';
  // to json if not string
  if (typeof input !== 'string') {
    const timestamp = parseInt(new Date().getTime().toString());
    const contextData = {
      ...input,
      timestamp: timestamp
    };
    dataStr = JSON.stringify(contextData);
  } else {
    dataStr = input;
  }
  const walletSignature = await hibitIdSession.wallet?.signMessage(dataStr);
  return await ex3ServiceClient({
    url: url,
    method: 'POST',
    data: {
      chain: '60',
      chainNetwork: '11155111',
      message: dataStr,
      signature: walletSignature
    }
  });
}

export const sendEx3UnSignedRequest = async <TInput>(
  input: TInput,
  url: string
): Promise<string> => {
  return await ex3ServiceClient<TInput>({
    url: url,
    method: 'POST',
    data: input
  });
}
