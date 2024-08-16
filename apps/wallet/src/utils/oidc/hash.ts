import {fnv1aHashToHex} from "./lib/oidc-spa-4.11.1/src/tools/fnv1aHashToHex.ts";

export const defaultScopes = ["openid", "profile", "email", "offline_access"];

// copy from oidc-spa to gererate hash
export const getConfigHash = (issuerUri: string, clientId: string, clientSecret: string | null, scopes: string[]) => {
    return fnv1aHashToHex(
        `${issuerUri} ${clientId} ${clientSecret ?? ""} ${scopes.join(" ")}`
    );
}