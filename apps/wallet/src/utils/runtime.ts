import { SDK_AUTH_PARAM_KEY } from "@deland-labs/hibit-id-sdk";
import { RuntimeEnv } from "./basicEnums";
import { retrieveLaunchParams } from '@telegram-apps/sdk';

export const IS_IN_IFRAME = window.top !== window.self;

let runtimeEnv: RuntimeEnv = RuntimeEnv.SDK;
let runtimeParams: unknown = undefined;
if (!IS_IN_IFRAME) {
  runtimeEnv = RuntimeEnv.WEB
}
try {
  const { initData } = retrieveLaunchParams();
  if (initData) {
    runtimeEnv = RuntimeEnv.TELEGRAM_MINI_APP
    runtimeParams = initData
  }
} catch (e) { /* empty */ }

if (runtimeEnv === RuntimeEnv.SDK) {
  const params = new URLSearchParams(window.location.search).get(SDK_AUTH_PARAM_KEY);
  if (params) {
    try {
      const jsonString = Buffer.from(params, 'hex').toString('utf-8')
      runtimeParams = JSON.parse(jsonString)
    } catch (e) {
      console.error('Failed to parse SDK auth params', e)
    }
  }
}

export const RUNTIME_ENV = runtimeEnv
export const RUNTIME_PARAMS = runtimeParams
