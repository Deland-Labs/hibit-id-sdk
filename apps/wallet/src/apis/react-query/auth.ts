import { useMutation } from "@tanstack/react-query"
import { createPasskey, selectPasskey } from "../../utils/passkey"
import { HibitIdSession } from "../../stores/session"
import { AES, enc } from "crypto-js"
import { PasskeyLoginResponse } from "sdk"
import rpcManager from "../../stores/rpc"
import { GetWalletInfoAsync, GetPrimaryKeyAsync, ResetPrimaryKeyAsync, RegisterWalletFlowAsync } from "../services/auth"
import { Ex3KeyResult } from "../models"

export const useCreatePasskeyMutation = () => {
  return useMutation({
    mutationFn: async () => {
      // TODO: get challenge
      const challenge = '0725abd7-d119-4f76-9d1c-6e392278c812'
      const credential = await createPasskey(challenge)
      return credential
    }
  })
}

export const useSelectPasskeyMutation = () => {
  return useMutation({
    mutationFn: async () => {
      // TODO: get challenge
      const challenge = '0725abd7-d119-4f76-9d1c-6e392278c812'
      const credentialId = await selectPasskey(challenge)
      return credentialId
    }
  })
}

export const useEx3AuthorizeMutation = () => {
  return useMutation({
    mutationFn: async ({ session, credentialId }: {
      session: HibitIdSession
      credentialId: string
    }) => {
      // TODO: get mnemonic
      console.log(credentialId)
      const mnemonic = 'unaware manage apart embrace gap age alcohol rabbit decrease purchase nerve flee'
      session.connect({ credentialId, phrase: mnemonic })
      // ex3 login
      const aesKey = await session.wallet!.signMessage('hello hibit')
      const walletInfoEx3Response = await GetWalletInfoAsync(session.validAddress);
      let ex3KeyResult: Ex3KeyResult;
      if (walletInfoEx3Response.value?.userId) {
        // getPrimaryKeyV2Async if it is eddsa supported chain
        let ex3KeyResultEx3Response = await GetPrimaryKeyAsync()
        if (!ex3KeyResultEx3Response.isSuccess) {
          throw new Error(
            `Get Primary Key Failed: ${ex3KeyResultEx3Response.message}`
          );
        }
        if (ex3KeyResultEx3Response.value?.ex3KeyPair) {
          ex3KeyResult = ex3KeyResultEx3Response.value!;
        } else {
          console.debug(
            `wallet is registered, but ex3 key is not created, start to create`
          );
          ex3KeyResultEx3Response = await ResetPrimaryKeyAsync(
            walletInfoEx3Response.value.userId,
            aesKey
          );
          ex3KeyResult = ex3KeyResultEx3Response.value!;
        }
      } else {
        console.debug(`wallet is not registered, start to register`);
        // wallet is not registered
        const registerResult = await RegisterWalletFlowAsync();
        if (!registerResult.value?.walletInfo.userId) {
          throw new Error('register wallet failed');
        }
        const ex3KeyPairEx3Response = await ResetPrimaryKeyAsync(
          registerResult.value.walletInfo.userId,
          aesKey
        );
        ex3KeyResult = ex3KeyPairEx3Response.value!;
        console.debug(`wallet is registered, ex3KeyResult`, ex3KeyResult);
      }
      // decrypt the private key
      const utf8Str = Buffer.from(
        ex3KeyResult.ex3KeyPair.privateKeyHex,
        'hex'
      ).toString('utf8');
      const data = AES.decrypt(utf8Str, aesKey).toString(enc.Utf8);
      const loginResponse: PasskeyLoginResponse = {
        address: session.validAddress,
        userKeyPair: {
          publicKey: ex3KeyResult.ex3KeyPair.publicKeyHex,
          privateKey: data.toString()
        },
        userId: ex3KeyResult.userId.toString(),
      };
      rpcManager.onLogin(loginResponse)
      session.setEx3Account(loginResponse)
    }
  })
}
