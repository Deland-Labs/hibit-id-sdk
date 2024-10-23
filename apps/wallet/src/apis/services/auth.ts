import { sendApiRequest } from '..';
import {
  CreateMnemonicInput,
  GetMnemonicInput,
  GetMnemonicResult,
  GetPublicKeyResult,
  GetUserLoginsResult,
  UpdateMnemonicInput,
  UpdateMnemonicResult
} from '../models';
import { EncryptionManager } from '../../utils/encryption';

export class MnemonicVersion {
  public static readonly V0PlainText = 0;
  public static readonly V1RsaSha1Aes = 1;
}

export class MnemonicManager {
  public static readonly instance = new MnemonicManager();
  private static readonly encryptionManager = new EncryptionManager();

  public async createAsync(mnemonicContent: string): Promise<string> {
    const publicKey = await GetPublicKeyAsync();
    const key = publicKey.publicKeyBase64;
    const encrypted = await MnemonicManager.encryptionManager.encrypt(key, mnemonicContent);
    await CreateMnemonicAsync({
      aesKey: encrypted.encryptedAesKeyAndIvBase64,
      mnemonicContent: encrypted.encryptedDataBase64,
      version: MnemonicVersion.V1RsaSha1Aes
    });
    return mnemonicContent;
  }

  public async updateAsync(oldVersion: number, oldMnemonicContent: string, newMnemonicContent: string): Promise<string> {
    const publicKey = await GetPublicKeyAsync();
    const key = publicKey.publicKeyBase64;
    const encryptedOld = await MnemonicManager.encryptionManager.encrypt(key, oldMnemonicContent);
    const encryptedNew = await MnemonicManager.encryptionManager.encrypt(key, newMnemonicContent);
    await UpdateMnemonicAsync(new UpdateMnemonicInput({
      oldAesKey: encryptedOld.encryptedAesKeyAndIvBase64,
      oldMnemonicContent: encryptedOld.encryptedDataBase64,
      oldVersion,
      newAesKey: encryptedNew.encryptedAesKeyAndIvBase64,
      newMnemonicContent: encryptedNew.encryptedDataBase64,
      newVersion: MnemonicVersion.V1RsaSha1Aes
    }));
    return newMnemonicContent;
  }

  public async getAsync(): Promise<GetMnemonicResult> {
    const { publicKeyBase64, privateKeyBase64 } = await MnemonicManager.encryptionManager.generateKeys();
    const mnemonic = await GetMnemonicAsync(new GetMnemonicInput({
      publicKey: publicKeyBase64
    }));
    if (mnemonic.version === MnemonicVersion.V0PlainText) {
      return mnemonic;
    } else if (mnemonic.version === MnemonicVersion.V1RsaSha1Aes) {
      const decryptedResult = await MnemonicManager.encryptionManager.decrypt(privateKeyBase64, mnemonic.aesKey, mnemonic.mnemonicContent);
      return new GetMnemonicResult({
        ...mnemonic,
        mnemonicContent: decryptedResult
      });
    } else {
      throw new Error(`Unsupported mnemonic version: ${mnemonic.version}`);
    }
  }
}

const CreateMnemonicAsync = async (input: CreateMnemonicInput) => {
  return await sendApiRequest<CreateMnemonicInput, GetMnemonicResult>(
    input,
    '/api/app/mnemonic'
  );
};

const GetMnemonicAsync = async (input: GetMnemonicInput) => {
  return await sendApiRequest<GetMnemonicInput, GetMnemonicResult>(
    input,
    '/api/app/mnemonic/get'
  );
};

export const DeleteMnemonicAsync = async () => {
  await sendApiRequest(
    null,
    '/api/app/mnemonic/delete'
  );
};

export const GetPublicKeyAsync = async () => {
  return await sendApiRequest<null, GetPublicKeyResult>(
    null,
    '/api/app/mnemonic/get-public-key',
    'POST',
    false
  );
};

export const UpdateMnemonicAsync = async (input: UpdateMnemonicInput) => {
  return await sendApiRequest<UpdateMnemonicInput, UpdateMnemonicResult>(
    input,
    '/api/app/mnemonic/update'
  );
};

export const GetUserLoginsAsync = async () => {
  return await sendApiRequest<null, GetUserLoginsResult>(
    null,
    '/api/app/user-login/get-user-logins'
  );
};
