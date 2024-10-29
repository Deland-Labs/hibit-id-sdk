import OAuth2OidcWindow from "../oauth2-oidc-window";
import { IAuthenticateProvider } from "../types";
import { AuthenticatorType } from "@delandlabs/hibit-id-sdk";

const AUTH_SERVER_URL = import.meta.env.VITE_HIBIT_AUTH_SERVER

export class GoogleAuthenticateProvider implements IAuthenticateProvider {
  public readonly type = AuthenticatorType.Google
  
  public authenticate: (launchParams?: any) => Promise<any> = async (launchParams?: string) => {
    const loginUrl = `${AUTH_SERVER_URL}id/login/google?returnUrl=${encodeURIComponent(`${location.origin}/oidc-login`)}`
    await new Promise((resolve, reject) => {
      OAuth2OidcWindow
        .open(loginUrl, location.origin)
        .then(() => {
          location.href = `${location.origin}/oidc-login`
          resolve(true)
        })
        ?.catch((reason) => {
          reject(reason)
        })
    })
  }
}
