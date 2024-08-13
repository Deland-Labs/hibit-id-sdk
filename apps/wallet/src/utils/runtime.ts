import { RuntimeEnv } from "./basicEnums";
import { retrieveLaunchParams } from '@telegram-apps/sdk';

export const IS_IN_IFRAME = window.top !== window.self;

let runtimeEnv: RuntimeEnv = RuntimeEnv.SDK;
let runtimeParamsRaw: string | undefined = undefined;
let runtimeParams: unknown = undefined;

if (!IS_IN_IFRAME) {
  runtimeEnv = RuntimeEnv.WEB
}

let isTelegramMiniApp = false;
try {
  const { initData, initDataRaw } = retrieveLaunchParams();
  if (initData) {
    isTelegramMiniApp = true;
    runtimeParamsRaw = initDataRaw
    runtimeParams = initData
  }
} catch (e) { /* empty */ }

export const IS_TELEGRAM_MINI_APP = isTelegramMiniApp;
export const RUNTIME_ENV = runtimeEnv
export const RUNTIME_PARAMS_RAW = runtimeParamsRaw
export const RUNTIME_PARAMS = runtimeParams
