// demo_print.mjs
import { generateAesKey, randomIv, aesGcmEncrypt, aesGcmDecrypt } from "./dist/aes.js";
import { generateRsaKeyPair, wrapAesKey, unwrapAesKey } from "./dist/rsa.js";
import { subtle, bufToBase64 } from "./dist/utils.js";

const run = async () => {
  // 1️⃣ 準備原文
  const text = "這是一段測試文字 🦄 123";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const plaintext = encoder.encode(text);
  console.log("原文 (UTF-8)：", text);

  // 2️⃣ 生成 RSA 金鑰對
  const { publicKey, privateKey } = await generateRsaKeyPair();
  // 匯出 PEM-compatible 格式（Base64 SPKI / PKCS8）
  const spki = await subtle.exportKey("spki", publicKey);
  const pkcs8 = await subtle.exportKey("pkcs8", privateKey);
  console.log("RSA PublicKey (SPKI, Base64)：", bufToBase64(spki));
  console.log("RSA PrivateKey (PKCS8, Base64)：", bufToBase64(pkcs8));

  // 3️⃣ 生成 AES-256-GCM Session Key
  const aesKey = await generateAesKey();
  const rawAes = await subtle.exportKey("raw", aesKey);
  console.log("AES-256-GCM SessionKey (raw, Base64)：", bufToBase64(rawAes));

  // 4️⃣ 隨機 IV
  const iv = randomIv();
  console.log("IV (Base64)：", bufToBase64(iv.buffer));

  // 5️⃣ AES-GCM 加密：得到 cipher|tag
  const cipherPlusTag = await aesGcmEncrypt(aesKey, plaintext, iv);
  // 分割 ciphertext / tag
  const TAG_BYTES = 16;
  const cipherText = cipherPlusTag.slice(0, -TAG_BYTES);
  const tag        = cipherPlusTag.slice(-TAG_BYTES);
  console.log("CipherText (Base64)：", bufToBase64(cipherText.buffer));
  console.log("GCM Tag (Base64)：",        bufToBase64(tag.buffer));

  // 6️⃣ RSA-OAEP 封裝 AES Key
  const wrappedKey = await wrapAesKey(aesKey, publicKey);
  console.log("Wrapped AES Key (RSA-OAEP, Base64)：", bufToBase64(wrappedKey.buffer));

  // -------------------- 模擬傳輸 / 存取 --------------------

  // 7️⃣ RSA-OAEP 解封裝
  const unwrappedKey = await unwrapAesKey(wrappedKey, privateKey);
  const rawUnwrapped = await subtle.exportKey("raw", unwrappedKey);
  console.log("Unwrapped AES Key (raw, Base64)：", bufToBase64(rawUnwrapped));

  // 8️⃣ 合併 ciphertext + tag，並 AES-GCM 解密
  const combined = new Uint8Array([...cipherText, ...tag]);
  const decrypted = await aesGcmDecrypt(unwrappedKey, combined, iv);
  console.log("解密後原文 (UTF-8)：", decoder.decode(decrypted));
};

run().catch(err => {
  console.error("執行錯誤：", err);
  process.exit(1);
});
