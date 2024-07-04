import dayjs from "dayjs"
import { client } from "@passwordless-id/webauthn"
import { DEFAULT_PASSKEY_USERNAME_PREFIX } from "./constants"
import { CredentialKey } from "@passwordless-id/webauthn/dist/esm/types"
import * as secp from '@noble/secp256k1';
import { Ex3KeyPair } from "../apis/models";
import { SignaturesSchema } from "./basicEnums";

const getPasskeyUsername = () => {
  return `${DEFAULT_PASSKEY_USERNAME_PREFIX} ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`
}

/**
 * @param {string} challenge base64url challenge
 * @returns {Promise<CredentialKey>} credential
 */
export const createPasskey = async (challenge: string): Promise<CredentialKey> => {
  const username = getPasskeyUsername()
  const registration = await client.register(username, challenge, {
    authenticatorType: 'auto',
    userVerification: 'required',
    timeout: 60000,
    attestation: false,
    debug: false
  })
  return registration.credential
}

/**
 * @param {string} challenge base64url challenge
 * @returns {Promise<string>} credentialId
 */
export const selectPasskey = async (challenge: string): Promise<string> => {
  const authentication = await client.authenticate([], challenge, {
    authenticatorType: 'auto',
    userVerification: 'required',
    timeout: 60000
  })
  return authentication.credentialId
}

export const genEx3KeyPair = (): Ex3KeyPair => {
  const privateKey = secp.utils.randomPrivateKey();
  const publicKey = secp.getPublicKey(privateKey, true);
  
  return {
    publicKeyHex: Buffer.from(publicKey).toString('hex'),
    privateKeyHex: Buffer.from(privateKey).toString('hex'),
    schema: SignaturesSchema.Secp256k1,
  };
};