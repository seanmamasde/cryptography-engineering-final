import { Buffer } from "buffer";
import base64url from "base64url";
const { subtle } = globalThis.crypto;

/** ——— PKI ——— **/
const PKI_ROOT = "/api/pki";
export type Certificate = { pem: string; subject: string; pubKey: CryptoKey };

export async function fetchCert(email: string): Promise<Certificate> {
  const res = await fetch(`${PKI_ROOT}/cert/${email}`);
  const { pem } = await res.json();
  const pubKey = await subtle.importKey(
    "spki",
    pemToArrayBuffer(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  return { pem, subject: email, pubKey };
}

/** ——— Key material utilities ——— **/
export async function loadOrCreateKeyPair() {
  let jwk = localStorage.getItem("rsaKey");
  if (!jwk) {
    const { publicKey, privateKey } = await subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );
    jwk = JSON.stringify(await subtle.exportKey("jwk", privateKey));
    localStorage.setItem("rsaKey", jwk);
    // register with PKI
    await fetch(`${PKI_ROOT}/register`, {
      method: "POST",
      body: JSON.stringify({ jwk }),
      headers: { "Content-Type": "application/json" },
    });
  }
  const privateKey = await subtle.importKey(
    "jwk",
    JSON.parse(jwk),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"],
  );
  return privateKey;
}

/** ——— File encryption ——— **/
export async function encryptFile(
  file: File,
  allowedRoles: string[],
): Promise<{ blob: Blob; meta: any }> {
  const aesKey = await subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    await file.arrayBuffer(),
  );
  // wrap AES key with our own public cert (returned by PKI)
  const selfCert = await fetchCert(JSON.parse(localStorage.user).email);
  const wrappedKey = await subtle.wrapKey("raw", aesKey, selfCert.pubKey, {
    name: "RSA-OAEP",
  });
  return {
    blob: new Blob([cipherBuf]),
    meta: {
      iv: base64url.encode(Buffer.from(iv)),
      tagLength: 128,
      wrappedKey: base64url.encode(Buffer.from(wrappedKey)),
      roles: allowedRoles,
    },
  };
}

export async function decryptBlob(
  cipherArrayBuffer: ArrayBuffer,
  meta: any,
): Promise<Blob> {
  const privateKey = await loadOrCreateKeyPair();
  const wrappedKey = new Uint8Array(base64url.toBuffer(meta.wrappedKey));
  const aesKey = await subtle.unwrapKey(
    "raw",
    wrappedKey,
    privateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const iv = new Uint8Array(base64url.toBuffer(meta.iv));
  const plaintext = await subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    cipherArrayBuffer,
  );
  return new Blob([plaintext]);
}

function pemToArrayBuffer(pem: string) {
  const b64 = pem
    .replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "")
    .replace(/\s/g, "");
  const bin = atob(b64);
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0))).buffer;
}
