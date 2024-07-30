import { createReactOidc } from "oidc-spa/react";

export const { OidcProvider, useOidc, prOidc } = createReactOidc({
  issuerUri: import.meta.env.VITE_OIDC_ISSUER_URI,
  clientId: import.meta.env.VITE_OIDC_CLIENT_ID,
  /**
   * Vite:  `publicUrl: import.meta.env.BASE_URL`
   * CRA:   `publicUrl: process.env.PUBLIC_URL`
   * Other: `publicUrl: "/"` (Usually)
   */
  publicUrl: import.meta.env.BASE_URL
});
