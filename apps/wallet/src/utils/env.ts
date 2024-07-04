import { BlockNetwork, HibitEnv } from "./basicEnums";

let env: HibitEnv = HibitEnv.DEV
switch (import.meta.env.VITE_APP_ENV.toLowerCase()) {
  case 'testnet': {
    env = HibitEnv.TEST;
    break
  }
  case 'mainnet': {
    env = HibitEnv.PROD;
    break
  }
}
export const HIBIT_ENV = env
export const BLOCK_NETWORK = HIBIT_ENV === HibitEnv.PROD? BlockNetwork.Mainnet : BlockNetwork.Testnet
