import { subtle } from "./utils.js";
import { AesKey } from "./types.js";
import { CryptoModuleError } from "./errors.js";

const AES_KEY_SIZE = 256;       // bits
const GCM_IV_BYTES = 12;        // 96-bit IV
const GCM_TAG_BYTES = 16;       // 128-bit Tag

export async function generateAesKey(): Promise<AesKey> {
  return subtle.generateKey(
    { name: "AES-GCM", length: AES_KEY_SIZE },
    true,                        // extractable (for RSA wrap)
    ["encrypt", "decrypt"]
  );
}

export function randomIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(GCM_IV_BYTES));
}

/** 回傳 {cipher, tag}；Tag 為 ciphertext 之末尾 16 bytes。 */
export async function aesGcmEncrypt(
  key: AesKey,
  plain: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  const encBuf = await subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: GCM_TAG_BYTES * 8 },
    key,
    plain
  );

  return new Uint8Array(encBuf); // cipher|tag
}

export async function aesGcmDecrypt(
  key: AesKey,
  cipherPlusTag: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  try {
    const decBuf = await subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: GCM_TAG_BYTES * 8 },
      key,
      cipherPlusTag
    );
    return new Uint8Array(decBuf);
  } catch (e) {
    throw new CryptoModuleError("AES-GCM 驗證失敗，資料可能遭竄改。");
  }
}
