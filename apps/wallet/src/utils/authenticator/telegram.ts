import { InitDataParsed } from "@telegram-apps/sdk";
import { AuthenticatorType, IAuthenticator, UserAuthInfo } from ".";
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

export class TelegramAuthenticator implements IAuthenticator {
  public readonly type = AuthenticatorType.Telegram
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public authenticate: (launchParams: any) => Promise<UserAuthInfo> = async (launchParams: InitDataParsed | undefined) => {
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
          // Validate data here 
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
