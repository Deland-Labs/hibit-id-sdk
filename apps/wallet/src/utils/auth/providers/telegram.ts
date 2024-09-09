import { objToQuery } from "../../url";
import { IAuthenticateProvider } from "../types";
import { AuthenticatorType } from "@delandlabs/hibit-id-sdk";

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
  }
}
