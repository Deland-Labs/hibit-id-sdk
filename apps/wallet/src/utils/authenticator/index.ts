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

export interface IAuthenticator {
  type: AuthenticatorType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticate: (launchParams: any) => Promise<UserAuthInfo>
}
