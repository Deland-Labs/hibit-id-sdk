import { RuntimeEnv } from "./basicEnums";
import { retrieveLaunchParams } from '@telegram-apps/sdk';

export const IS_IN_IFRAME = window.top !== window.self;

let runtimeEnv: RuntimeEnv = RuntimeEnv.SDK;
let runtimeParamsRaw: string | undefined = undefined;
let runtimeParams: unknown = undefined;

if (!IS_IN_IFRAME) {
  runtimeEnv = RuntimeEnv.WEB
}
try {
  const { initData, initDataRaw } = retrieveLaunchParams();
  if (initData) {
    runtimeEnv = RuntimeEnv.TELEGRAM_MINI_APP
    runtimeParamsRaw = initDataRaw
    runtimeParams = initData
  }
} catch (e) { /* empty */ }

export const RUNTIME_ENV = runtimeEnv
export const RUNTIME_PARAMS_RAW = runtimeParamsRaw
export const RUNTIME_PARAMS = runtimeParams
