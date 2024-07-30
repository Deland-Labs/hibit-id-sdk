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
const AUTH_SERVER_URL = `${import.meta.env.VITE_HIBIT_AUTH_SERVER}Telegram/Login`

export class TelegramAuthenticateProvider implements IAuthenticateProvider {
  public readonly type = AuthenticatorType.Telegram
  
  public authenticate: (launchParams?: any) => Promise<any> = async (launchParams?: string) => {
    // mini app
    if (launchParams) {
      window.location.href = `${AUTH_SERVER_URL}?tgWebAppData=${launchParams}`
    }
    
    // web login
    window.Telegram.Login.auth(
      { bot_id: BOT_ID, request_access: 'write' },
      (data: ResponseType) => {
        if (!data) {
          console.log('ERROR: something went wrong');
        }
        const userData: any = { ...data }
        delete userData.hash
        delete userData.auth_date
        const queryValue = `user=${encodeURIComponent(JSON.stringify(userData))}&auth_date=${data.auth_date}&hash=${data.hash}`
        window.location.href = `${AUTH_SERVER_URL}?tgWebAppData=${encodeURIComponent(queryValue)}`
      },
    );
  }
}
