import { InitDataParsed } from "@telegram-apps/sdk";
import { AuthenticatorType, IAuthenticateProvider, UserAuthInfo } from "../types";
import dayjs from "dayjs";

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
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public authenticate: (launchParams?: any) => Promise<UserAuthInfo> = async (launchParams?: InitDataParsed) => {
    if (launchParams) {
      return {
        id: launchParams.user?.id.toString() ?? '',
        name: launchParams.user?.username ?? '',
        authTimestamp: launchParams.authDate,
      }
    }
    
    return new Promise((resolve) => {
      window.Telegram.Login.auth(
        { bot_id: BOT_ID, request_access: 'write' },
        (data: ResponseType) => {
          if (!data) {
            console.log('ERROR: something went wrong');
          }
          // TODO: Validate data here 
          console.log('[tg data]', data);
          resolve({
            id: data.id.toString(),
            name: data.username || [data.first_name, data.last_name].join(' '),
            authTimestamp: dayjs(data.auth_date).toDate(),
          })
        },
      );
    })
  }
}