/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { CryptoModuleError } from "./errors.js";

// Node ≥20 與 Browser 均支援 globalThis.crypto
export const subtle = (globalThis.crypto as Crypto).subtle;

/* ---------- ArrayBuffer / Uint8Array ↔︎ Base64 ---------- */

export function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  return Uint8Array.from([...bin].map(c => c.charCodeAt(0))).buffer;
}

export function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  arrays.forEach(a => {
    out.set(a, offset);
    offset += a.length;
  });
  return out;
}

/* ---------- Little helpers ---------- */

export function ensureWebCrypto(): void {
  if (!subtle) {
    throw new CryptoModuleError("WebCrypto API not available in this runtime.");
  }
}
