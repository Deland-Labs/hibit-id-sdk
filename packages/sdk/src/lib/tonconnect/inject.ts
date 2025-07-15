import { CHAIN } from '@tonconnect/protocol';
import { TonConnect } from '.';
import '../dom/index.css';

export const injectHibitIdTonConnect = (chain: CHAIN) => {
  const tonconnect = new TonConnect(chain);
  (window as any)[tonconnect.deviceInfo.appName] = {
    tonconnect
  };
};
