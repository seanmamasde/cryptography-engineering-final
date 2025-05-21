import { subtle } from "./utils.js";
import { RsaPrivateKey, RsaPublicKey, AesKey } from "./types.js";

const RSA_MODULUS_BITS = 4096;

export async function generateRsaKeyPair(): Promise<{
  publicKey: RsaPublicKey;
  privateKey: RsaPrivateKey;
}> {
  const pair = await subtle.generateKey(
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
      modulusLength: RSA_MODULUS_BITS,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]) // 65537
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

/** 使用 RSA 公鑰將 AES 金鑰封裝 */
export async function wrapAesKey(
  aesKey: AesKey,
  rsaPub: RsaPublicKey
): Promise<Uint8Array> {
  const wrapped = await subtle.wrapKey("raw", aesKey, rsaPub, {
    name: "RSA-OAEP"
  });
  return new Uint8Array(wrapped);
}

/** 解封裝 AES 金鑰 */
export async function unwrapAesKey(
  wrapped: Uint8Array,
  rsaPriv: RsaPrivateKey
): Promise<AesKey> {
  return subtle.unwrapKey(
    "raw",
    wrapped,
    rsaPriv,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}
