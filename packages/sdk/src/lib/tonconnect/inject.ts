import { CHAIN } from "@tonconnect/protocol";
import { TonConnect } from ".";

export const injectHibitIdTonConnect = (chain: CHAIN) => {
  const tonconnect = new TonConnect(chain)
  ;(window as any)[tonconnect.deviceInfo.appName].tonconnect = tonconnect;
}
