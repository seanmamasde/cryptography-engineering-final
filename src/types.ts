export interface EncryptedPacket {
  cipherText: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
  wrappedKey: Uint8Array;
  algo: "AES-GCM";
}

export type AesKey = CryptoKey;  
export type RsaPublicKey = CryptoKey;
export type RsaPrivateKey = CryptoKey;