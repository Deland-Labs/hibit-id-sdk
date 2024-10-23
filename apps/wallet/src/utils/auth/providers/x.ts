import { IAuthenticateProvider } from "../types";
import { AuthenticatorType } from "@delandlabs/hibit-id-sdk";

const AUTH_SERVER_URL = import.meta.env.VITE_HIBIT_AUTH_SERVER

export class XAuthenticateProvider implements IAuthenticateProvider {
  public readonly type = AuthenticatorType.X
  
  public authenticate: (launchParams?: any) => Promise<any> = async (launchParams?: string) => {
    window.location.href = 
      `${AUTH_SERVER_URL}id/login/twitter?returnUrl=${encodeURIComponent(`${location.origin}/oidc-login`)}`
    return
  }
}
