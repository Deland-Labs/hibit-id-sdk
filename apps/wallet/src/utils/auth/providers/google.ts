import { IAuthenticateProvider } from "../types";
import { AuthenticatorType } from "@delandlabs/hibit-id-sdk";

const AUTH_SERVER_URL = import.meta.env.VITE_HIBIT_AUTH_SERVER

export class GoogleAuthenticateProvider implements IAuthenticateProvider {
  public readonly type = AuthenticatorType.Google
  
  public authenticate: (launchParams?: any) => Promise<any> = async (launchParams?: string) => {
    window.location.href = 
      `${AUTH_SERVER_URL}id/login/google?returnUrl=${encodeURIComponent(`${location.origin}/oidc-login`)}`
    return
  }
}
