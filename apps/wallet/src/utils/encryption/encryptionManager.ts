import {Buffer} from "buffer";

export class EncryptionManager {
  private aesProvider: IAesProvider = new AesProviderImpl();

  public async generateKeys(): Promise<{ publicKeyBase64: string, privateKeyBase64: string }> {
    const keys = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-1"
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicKeyBuffer = await crypto.subtle.exportKey("spki", keys.publicKey);
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keys.privateKey);

    return {
      publicKeyBase64: Buffer.from(publicKeyBuffer).toString('base64'),
      privateKeyBase64: Buffer.from(privateKeyBuffer).toString('base64')
    };
  }

  private async encryptRSA(publicKeyBase64: string, data: ArrayBuffer): Promise<ArrayBuffer> {
    const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-1"
      },
      true,
      ["encrypt"]
    );

    return await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      data
    );
  }

  private async decryptRSA(privateKeyBase64: string, data: ArrayBuffer): Promise<ArrayBuffer> {
    const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64');
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-1"
      },
      true,
      ["decrypt"]
    );

    return await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      data
    );
  }

  public async encrypt(publicKeyBase64: string, data: string): Promise<{
    encryptedAesKeyAndIvBase64: string,
    encryptedDataBase64: string
  }> {
    const aesKey = await this.aesProvider.generateKey()
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const aesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);
    const encryptedAesKeyBuffer = await this.encryptRSA(publicKeyBase64, aesKeyBuffer);
    const encryptedIv = await this.encryptRSA(publicKeyBase64, iv);
    const encryptedAesKeyBase64 = Buffer.from(encryptedAesKeyBuffer).toString('base64');
    const encryptedIvBase64 = Buffer.from(encryptedIv).toString('base64');

    const encryptedDataBuffer = await this.aesProvider.encrypt(data, aesKey, iv);
    return {
      encryptedAesKeyAndIvBase64: `${encryptedAesKeyBase64}:${encryptedIvBase64}`,
      encryptedDataBase64: Buffer.from(encryptedDataBuffer).toString('base64')
    };
  }

  public async decrypt(privateKeyBase64: string, encryptedAesKeyAndIvBase64: string, encryptedDataBase64: string): Promise<string> {
    const [encryptedAesKeyBase64, encryptedIvBase64] = encryptedAesKeyAndIvBase64.split(':');
    const aesKeyBuffer = await this.decryptRSA(privateKeyBase64, Buffer.from(encryptedAesKeyBase64, 'base64'));
    const iv = await this.decryptRSA(privateKeyBase64, Buffer.from(encryptedIvBase64, 'base64'));
    const aesKey = await this.aesProvider.createKey(aesKeyBuffer);
    const encryptedDataBuffer = Buffer.from(encryptedDataBase64, 'base64');
    const decryptedDataBuffer = await this.aesProvider.decrypt(encryptedDataBuffer, aesKey, iv);
    return Buffer.from(decryptedDataBuffer).toString('utf-8');
  }
}

export interface IAesProvider {
  generateKey(): Promise<CryptoKey>;

  createKey(key: ArrayBuffer): Promise<CryptoKey>;

  encrypt(data: string, key: CryptoKey, iv: ArrayBuffer): Promise<ArrayBuffer>;

  decrypt(data: ArrayBuffer, key: CryptoKey, iv: ArrayBuffer): Promise<string>;
}

class AesProviderImpl implements IAesProvider {
  async encrypt(data: string, key: CryptoKey, iv: ArrayBuffer): Promise<ArrayBuffer> {
    return await crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv
      },
      key,
      Buffer.from(data, 'utf-8')
    );
  }

  async decrypt(data: ArrayBuffer, key: CryptoKey, iv: ArrayBuffer): Promise<string> {
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv
      },
      key,
      data
    );
    return Buffer.from(decryptedData).toString('utf-8');
  }

  generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: "AES-CBC",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  createKey(key: ArrayBuffer): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      "raw",
      key,
      {
        name: "AES-CBC",
      },
      true,
      ["encrypt", "decrypt"]
    );
  }


} 