import crypto from "node:crypto";

/** Encrypt a Buffer with a fresh random 32-byte key and 12-byte IV. */
export function encrypt(buffer: Buffer) {
  const key = crypto.randomBytes(32);          // AES-256
  const iv  = crypto.randomBytes(12);          // recommended GCM IV length

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();             // 16-byte MAC

  return { key, iv, tag, encrypted };
}

/** Decrypt when you already have key/iv/tag. */
export function decrypt(encrypted: Buffer, key: Buffer, iv: Buffer, tag: Buffer) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain;
}
