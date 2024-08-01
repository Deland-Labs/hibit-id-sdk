import {createReactOidc} from "./lib/oidc-spa-4.11.1/src/react";

export const {OidcProvider, useOidc, prOidc} = createReactOidc({
  issuerUri: import.meta.env.VITE_HIBIT_AUTH_SERVER,
  clientId: import.meta.env.VITE_HIBIT_AUTH_CLIENT_ID,
  /**
   * Vite:  `publicUrl: import.meta.env.BASE_URL`
   * CRA:   `publicUrl: process.env.PUBLIC_URL`
   * Other: `publicUrl: "/"` (Usually)
   */
  scopes: ["openid", "profile", "email", "offline_access"],
  publicUrl: import.meta.env.BASE_URL,
});