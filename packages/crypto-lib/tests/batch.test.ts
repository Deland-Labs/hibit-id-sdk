import { bip39, bip32, base, signUtil} from "../src"
import * as fs from "fs"
import { describe, test } from 'vitest'
import { join } from 'path';
import os from 'os';

// 使用系统临时目录
const tmpDir = os.tmpdir();
const bip32Path = join(tmpDir, 'bip32.txt');
const hashPath = join(tmpDir, 'hash.txt');

describe("crypto", () => {
  // mnemonic root  child  secp256k1-public ed25519-public msg  secp256k1-signature ed25519-signature
  test("bip32", async () => {
    if(fs.existsSync(bip32Path)) {
       fs.unlinkSync(bip32Path)
    }

    for(let i = 0; i < 100; i++) {
      const mnemonic = bip39.generateMnemonic()
      const masterSeed = await bip39.mnemonicToSeed(mnemonic)
      const rootKey = bip32.fromSeed(masterSeed)
      const childKey =  rootKey.derivePath("m/44'/0'/0'/0/0")
      const items: string[] = []
      items.push(mnemonic)
      items.push(base.toHex(rootKey.privateKey!))
      items.push(base.toHex(childKey.privateKey!) )

      const pk = childKey.privateKey!
      const pb1 =  signUtil.secp256k1.publicKeyCreate(pk, true)
      items.push(base.toHex(pb1))

      const pb2 = signUtil.ed25519.publicKeyCreate(pk)
      items.push(base.toHex(pb2))

      const msg = base.randomBytes(32)
      items.push(base.toHex(msg))

     // recovery + r + s
      const s1 = signUtil.secp256k1.sign(msg, pk, true)
      items.push(base.toHex(base.concatBytes(Uint8Array.of(s1.recovery + 27), s1.signature)))

      const s2 = signUtil.ed25519.sign(msg, pk)
      items.push(base.toHex(s2))

     const line = items.join(",") + "\r\n"
     fs.appendFileSync(bip32Path, line)
     const info = `${i}  ${line}`
     console.info(info)
    }
  })

  test("hash", async () => {
    if(fs.existsSync(hashPath)) {
      fs.unlinkSync(hashPath)
    }

    for(let i = 0; i < 100; i++) {
      const msg = base.randomBytes(32)
      const s1 = base.toHex(base.sha256(msg))
      const s2 = base.toHex(base.sha512(msg))
      const s3 = base.toBase58(msg)
      const s4 = base.toBase58Check(msg)
      const s5 = base.toBase64(msg)
      const s6 = base.toBech32("prefix", msg)
      const s7 = base.toHex(base.hash160(msg))
      const s8 = base.toHex(base.keccak256(msg))
      const s9 = base.toHex(base.hmacSHA256("key", msg))

      const items = [base.toHex(msg), s1, s2, s3, s4, s5, s6, s7, s8, s9]
      const line = items.join(",") + "\r\n"
      fs.appendFileSync(hashPath, line)
      const info = `${i}  ${line}`
      console.info(info)
    }
  })
})
