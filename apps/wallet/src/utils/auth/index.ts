import { AuthenticatorType, HibitIdAuth, IAuthenticateProvider } from "./types";
import { TelegramAuthenticateProvider } from "./providers/telegram";

export class AuthManager {
  public static readonly supportedAuthenticators: AuthenticatorType[] = [AuthenticatorType.Telegram]

  private _provider: IAuthenticateProvider | null = null

  constructor() { }

  /**
   * Log user into Hibit ID
   * @param {AuthenticatorType} type
   * @param launchParams same as in IAuthenticateProvider.authenticate()
   * @returns {Promise<HibitIdAuth>} user's Hibit Id auth object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  login = async (type: AuthenticatorType, launchParams?: any): Promise<HibitIdAuth> => {
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

    // TODO: trade userInfo for wallet phrase
    console.log('[authenticated user info]', userInfo)
    const mnemonicPhrase = 'unaware manage apart embrace gap age alcohol rabbit decrease purchase nerve flee'
    return {
      userInfo,
      phrase: mnemonicPhrase
    }
  }
}

const authManager = new AuthManager()
export default authManager
