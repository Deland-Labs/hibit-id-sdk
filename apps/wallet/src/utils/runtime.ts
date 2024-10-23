import { RuntimeEnv } from "./basicEnums";
import { retrieveLaunchParams } from '@telegram-apps/sdk';
import { ChainId } from "./basicTypes";
import { Language } from "./lang";
import { Dfinity } from "./chain/chain-list";

export const IS_IN_IFRAME = window.top !== window.self;

let runtimeEnv: RuntimeEnv = RuntimeEnv.SDK;
let runtimeIcrcHost: string | undefined = undefined;
let runtimeIcrcDev: boolean = false;
let runtimeParamsRaw: string | undefined = undefined;
let runtimeParams: unknown = undefined;
let runtimeSupportedChainIds: ChainId[] = [];
let runtimeLang: Language | undefined = undefined;

const urlParams = new URLSearchParams(window.location.search);

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

// Dfinity ICRC PostMessage
if (urlParams.has('is_icrc') || sessionStorage.getItem('is_icrc')) {
  runtimeEnv = RuntimeEnv.ICRC_POSTMESSAGE
  runtimeSupportedChainIds = [Dfinity.chainId]
  sessionStorage.setItem('is_icrc', '1')
  if (urlParams.get('icrc_host') || sessionStorage.getItem('icrc_host')) {
    runtimeIcrcHost = urlParams.get('icrc_host') || sessionStorage.getItem('icrc_host') || undefined
    if (runtimeIcrcHost) {
      sessionStorage.setItem('icrc_host', runtimeIcrcHost)
    }
  }
  if (urlParams.get('icrc_dev') || sessionStorage.getItem('icrc_dev')) {
    runtimeIcrcDev = !!(urlParams.get('icrc_dev') || sessionStorage.getItem('icrc_dev'))
    if (runtimeIcrcDev) {
      sessionStorage.setItem('icrc_dev', '1')
    }
  }
}

urlParams.get('chains')?.split(',').forEach((idStr) => {
  const chainId = ChainId.fromString(idStr)
  if (chainId) {
    runtimeSupportedChainIds.push(chainId)
  }
})
runtimeLang = urlParams.get('lang') as Language || undefined

export const IS_TELEGRAM_MINI_APP = isTelegramMiniApp;
export const RUNTIME_ENV = runtimeEnv
export const RUNTIME_ICRC_HOST = runtimeIcrcHost
export const RUNTIME_ICRC_DEV = runtimeIcrcDev
export const RUNTIME_PARAMS_RAW = runtimeParamsRaw
export const RUNTIME_PARAMS = runtimeParams
export const RUNTIME_SUPPORTED_CHAIN_IDS = runtimeSupportedChainIds
export const RUNTIME_LANG = runtimeLang

console.debug('[runtime env]', RUNTIME_ENV)
console.debug('[runtime icrc host]', RUNTIME_ICRC_HOST)
console.debug('[runtime icrc dev]', RUNTIME_ICRC_DEV)
console.debug('[runtime params]', RUNTIME_PARAMS)
console.debug('[runtime supported chains]', RUNTIME_SUPPORTED_CHAIN_IDS)
console.debug('[runtime lang]', RUNTIME_LANG)
