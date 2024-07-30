import { AuthenticatorType } from "@deland-labs/hibit-id-sdk"

export interface IAuthenticateProvider {
  type: AuthenticatorType

  /**
   * run provider's authenticate process to get user identity
   * @param launchParams possible initial info injected by runtime environment
   * @returns {any} OIDC params
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticate: (launchParams?: any) => Promise<any>
}
