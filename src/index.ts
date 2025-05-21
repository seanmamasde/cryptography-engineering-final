// 檔案：src/index.ts

// 1️⃣ 從各子模組 import
import { generateAesKey, randomIv, aesGcmEncrypt, aesGcmDecrypt } from "./aes.js";
import { wrapAesKey, unwrapAesKey, generateRsaKeyPair } from "./rsa.js";
import { concatUint8 } from "./utils.js";
import { EncryptedPacket, RsaPublicKey, RsaPrivateKey } from "./types.js";

/**
 * 對外公開：RSA 金鑰生成
 */
export { generateRsaKeyPair };

/**
 * 對外公開：檔案加密
 */
export async function encryptFile(
  fileBuf: ArrayBuffer,
  rsaPub: RsaPublicKey
): Promise<EncryptedPacket> {
  // 1. 產生 session key
  const aesKey = await generateAesKey();
  // 2. 產生 IV
  const iv = randomIv();
  // 3. AES-GCM 加密（回傳 cipher|tag）
  const cipherPlusTag = await aesGcmEncrypt(
    aesKey,
    new Uint8Array(fileBuf),
    iv
  );
  // 4. RSA-OAEP 封裝 AES 金鑰
  const wrappedKey = await wrapAesKey(aesKey, rsaPub);
  // 5. 切割出 ciphertext 與 tag
  const TAG_BYTES = 16;
  const cipherText = cipherPlusTag.slice(0, -TAG_BYTES);
  const tag        = cipherPlusTag.slice(-TAG_BYTES);

  return { cipherText, iv, tag, wrappedKey, algo: "AES-GCM" };
}

/**
 * 對外公開：檔案解密
 */
export async function decryptFile(
  packet: EncryptedPacket,
  rsaPriv: RsaPrivateKey
): Promise<Uint8Array> {
  // 1. 解封裝 AES 金鑰
  const aesKey = await unwrapAesKey(packet.wrappedKey, rsaPriv);
  // 2. 合併 ciphertext + tag
  const cipherPlusTag = concatUint8(packet.cipherText, packet.tag);
  // 3. 驗證並解密
  return aesGcmDecrypt(aesKey, cipherPlusTag, packet.iv);
}
