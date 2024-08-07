import { IAuthenticateProvider } from "./types";
import { TelegramAuthenticateProvider } from "./providers/telegram";
import { AuthenticatorType } from "@deland-labs/hibit-id-sdk";
import { prOidc } from "../oidc";

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
    await this._provider.authenticate(launchParams)
  }

  logout = async (): Promise<void> => {
    const oidc = await prOidc
    if (!oidc.isUserLoggedIn) {
      return;
    }
    await oidc.logout({
      redirectTo: 'specific url',
      url: window.location.origin,
    })
  }
}

const authManager = new AuthManager()
export default authManager
