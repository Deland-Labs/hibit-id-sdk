import { sendWalletRequest, serviceClient } from "..";
import { AES } from "crypto-js";
import { genEx3KeyPair } from "../../utils/passkey";
import { Ex3JSON } from "../../utils/json";
import { Ex3KeyResult, RegisterWalletFlowResult, WalletInfo } from "../models";
import { UserId } from "../../utils/basicTypes";

const SIGN_SCHEMA = '0xa';

export const RegisterWalletFlowAsync = async () => {
  const pubKey = '0x00';
  const payload = [
    'subject: wallet registration',
    `chain: 0xaa36a7`,
    `sign_schema: ${SIGN_SCHEMA}`,
    `pub_key: ${pubKey}`
  ].join('\n');
  const result = await sendWalletRequest(
    payload,
    '/api/app/wallet/register-wallet-flow'
  );
  return Ex3JSON.parseEx3Ex3Response(result, RegisterWalletFlowResult);
}

export const GetWalletInfoAsync = async (address: string) => {
  const result = await serviceClient({
    url: '/api/app/wallet/get-wallet-info',
    method: 'POST',
    data: {
      chain: '60',
      address,
    },
  });
  return Ex3JSON.parseEx3Ex3Response(result, WalletInfo);
}

export const ResetPrimaryKeyAsync = async (
  userId: UserId,
  aesKey: string
) => {
  const nonce = 1;
  // if (!isFirstTime) {
  //   let marketApi = MarketApi.Instance();
  //   const nonceResult = await marketApi.GetUserNonceAsync();
  //   if (!nonceResult.isSuccess) {
  //     throw 'Get nonce failed';
  //   }
  //   nonce = nonceResult.value.nonce.value.toNumber();
  // }

  const ex3KeyPair = genEx3KeyPair();
  // encrypt private key
  ex3KeyPair.privateKeyHex = Buffer.from(
    AES.encrypt(ex3KeyPair.privateKeyHex, aesKey).toString()
  ).toString('hex');

  // create payload
  const nonceHex = '0x' + nonce.toString(16);
  const walletIdHex = '0x' + userId.value.toString(16);
  const payload = [
    'subject: main secret reset',
    `wallet_id: ${walletIdHex}`,
    `nonce: ${nonceHex}`,
    `sign_schema: ${SIGN_SCHEMA}`,
    `data.encrypted_pri_key: 0x${ex3KeyPair.privateKeyHex}`,
    `data.l2_pub_key: 0x${ex3KeyPair.publicKeyHex}`
  ].join('\n');

  const result = await sendWalletRequest(
    payload,
    '/api/app/key/reset-primary-key'
  );
  return Ex3JSON.parseEx3Ex3Response(result, Ex3KeyResult);
}

export const GetPrimaryKeyAsync = async () => {
  const timestamp = parseInt(new Date().getTime().toString());

  const payload = [
    `subject: get primary key`,
    `sign_schema: ${SIGN_SCHEMA}`,
    `timestamp: ${timestamp}`
  ].join('\n');

  const result = await sendWalletRequest(
    payload,
    '/api/app/key/get-primary-key'
  );
  return Ex3JSON.parseEx3Ex3Response(result, Ex3KeyResult);
}

export const GetPrimaryKeyV2Async = async (
  userId: string
) => {
  const timestamp = parseInt(new Date().getTime().toString());
  const walletIdHex = '0x' + Number(userId).toString(16);

  const payload = [
    `subject: get primary key`,
    `wallet_id: ${walletIdHex}`,
    `sign_schema: ${SIGN_SCHEMA}`,
    `timestamp: ${timestamp}`
  ].join('\n');

  const result = await sendWalletRequest(
    payload,
    '/api/app/key/get-primary-key-v2'
  );
  return Ex3JSON.parseEx3Ex3Response(result, Ex3KeyResult);
}
