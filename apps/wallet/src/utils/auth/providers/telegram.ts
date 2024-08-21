import { objToQuery } from "../../url";
import { IAuthenticateProvider } from "../types";
import { AuthenticatorType } from "@deland-labs/hibit-id-sdk";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Telegram: any;
  }
}

interface ResponseType {
  auth_date: number;
  first_name: string;
  hash: string;
  id: number;
  last_name: string;
  photo_url: string;
  username: string;
}

const BOT_ID = import.meta.env.VITE_TELEGRAM_BOT_ID
const AUTH_SERVER_URL = import.meta.env.VITE_HIBIT_AUTH_SERVER

export class TelegramAuthenticateProvider implements IAuthenticateProvider {
  public readonly type = AuthenticatorType.Telegram
  
  public authenticate: (launchParams?: any) => Promise<any> = async (launchParams?: string) => {
    // mini app
    if (launchParams) {
      // sessionStorage.removeItem('telegram-apps/launch-params')
      window.location.href = `${AUTH_SERVER_URL}connect/custom/telegram/login?tgWebAppData=${encodeURIComponent(launchParams)}&returnUrl=${encodeURIComponent(`${location.origin}/oidc-login`)}`
      return
    }
    
    // web login
    return new Promise((resolve, reject) => {
      window.Telegram.Login.auth(
        { bot_id: BOT_ID, request_access: 'write' },
        (data: ResponseType) => {
          if (!data) {
            reject(new Error('Telegram login failed'))
            return
          }
          const queryValue = objToQuery(data)
          // sessionStorage.removeItem('telegram-apps/launch-params')
          window.location.href = `${AUTH_SERVER_URL}connect/custom/telegram/login?${queryValue}&returnUrl=${encodeURIComponent(`${location.origin}/oidc-login`)}`
          resolve(true)
        },
      );
    })

    // const data = {"id":6910684932,"first_name":"Rustin","last_name":"Chi","auth_date":1722478423,"hash":"46b0a8a1cae9d379c96896546bf37b05b5e8c088c51da9feaa675b2b878c79ae"}
    // const queryValue = objToQuery(data)
    // window.location.href = `${AUTH_SERVER_URL}Telegram/WebLogin?${queryValue}&returnUrl=${encodeURIComponent(`${location.origin}`)}`
  }
}
