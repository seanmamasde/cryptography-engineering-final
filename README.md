# Crypto-API 子模組

實作 **端到端檔案加解密**  
* 內容加密：AES-256-GCM  
* 金鑰封裝：RSA-4096-OAEP(SHA-256)

## 基本使用

```ts
import { generateRsaKeyPair, encryptFile, decryptFile } from "crypto-api";

// 1️⃣ 建立／匯入 RSA Key Pair
const { publicKey, privateKey } = await generateRsaKeyPair();

// 2️⃣ Encrypt
const enc = await encryptFile(fileBuffer, publicKey);
/*
enc = {
  cipherText,   // Uint8Array
  iv, tag,      // Uint8Array
  wrappedKey,   // Uint8Array
  algo: "AES-GCM"
}
*/

// 3️⃣ Decrypt
const plain = await decryptFile(enc, privateKey);
