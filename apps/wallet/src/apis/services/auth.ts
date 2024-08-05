import { sendAuthRequest } from "..";
import { CreateMnemonicInput, GetMnemonicInput, GetMnemonicResult, GetPublicKeyResult, GetUserLoginsResult, UpdateMnemonicInput, UpdateMnemonicResult } from "../models";

export const CreateMnemonicAsync = async (input: CreateMnemonicInput) => {
  await sendAuthRequest(
    input,
    '/api/app/mnemonic'
  );
}

export const GetMnemonicAsync = async (input: GetMnemonicInput) => {
  const result = await sendAuthRequest<GetMnemonicInput, GetMnemonicResult>(
    input,
    '/api/app/mnemonic/get'
  );
  return result
}

export const DeleteMnemonicAsync = async () => {
  await sendAuthRequest(
    null,
    '/api/app/mnemonic/delete'
  );
}

export const GetPublicKeyAsync = async () => {
  const result = await sendAuthRequest<null, GetPublicKeyResult>(
    null,
    '/api/app/mnemonic/public-key',
    'GET',
  );
  return result
}

export const UpdateMnemonicAsync = async (input: UpdateMnemonicInput) => {
  const result = await sendAuthRequest<UpdateMnemonicInput, UpdateMnemonicResult>(
    input,
    '/api/app/mnemonic/update'
  );
  return result
}

export const GetUserLoginsAsync = async () => {
  const result = await sendAuthRequest<null, GetUserLoginsResult>(
    null,
    '/api/app/user-login/get-user-logins',
  )
  return result
}
