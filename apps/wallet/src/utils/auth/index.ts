import { AuthenticatorType, IAuthenticateProvider } from "./types";
import { TelegramAuthenticateProvider } from "./providers/telegram";
import hibitIdSession from "../../stores/session";

export class AuthManager {
  public static readonly supportedAuthenticators: AuthenticatorType[] = [AuthenticatorType.Telegram]

  private _provider: IAuthenticateProvider | null = null

  constructor() { }

  /**
   * Log user into Hibit ID
   * @param {AuthenticatorType} type
   * @param launchParams same as in IAuthenticateProvider.authenticate()
   * @returns {Promise<void>}
   */
  login = async (type: AuthenticatorType, launchParams?: any): Promise<void> => {
    switch (type) {
      case AuthenticatorType.Telegram: {
        this._provider = new TelegramAuthenticateProvider()
        break
      }
      default: {
        throw new Error(`Authenticator type ${type} is not supported`)
      }
    }
    const userInfo = await this._provider.authenticate(launchParams)
    await hibitIdSession.connect(userInfo)
  }
}

const authManager = new AuthManager()
export default authManager
