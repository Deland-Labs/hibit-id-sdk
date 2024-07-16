export enum AuthenticatorType {
  Telegram = 'telegram',
  Google = 'google',
  Facebook = 'facebook',
  Apple = 'apple',
  X = 'x',
  // Add more authenticators here
}

export interface UserAuthInfo {
  id: string
  name: string
  authTimestamp: Date
}

export interface IAuthenticateProvider {
  type: AuthenticatorType

  /**
   * run provider's authenticate process to get user identity
   * @param launchParams possible initial info injected by runtime environment
   * @returns {UserAuthInfo} user identity for hibit id auth
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticate: (launchParams?: any) => Promise<UserAuthInfo>
}
