import { InitDataParsed } from "@telegram-apps/sdk";
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

export class TelegramAuthenticateProvider implements IAuthenticateProvider {
  public readonly type = AuthenticatorType.Telegram
  
  public authenticate: (launchParams?: any) => Promise<any> = async (launchParams?: InitDataParsed) => {
    // mini app
    if (launchParams) {
      // TODO: Validate data here 
      return launchParams
    }
    
    // web login
    return new Promise((resolve) => {
      window.Telegram.Login.auth(
        { bot_id: BOT_ID, request_access: 'write' },
        (data: ResponseType) => {
          if (!data) {
            console.log('ERROR: something went wrong');
          }
          // TODO: Validate data here 
          console.log('[tg data]', data);
          resolve(data)
        },
      );
    })
  }
}
