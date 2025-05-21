// src/API/EncryptedDownload.ts ---------------------------------
import { b64ToBlob } from "@/utils/kmsClient";

export async function encryptedDownload(fileId: string) {
  /* 1) get cipher + metadata from Drive DB */
  const meta = await fetch(`/api/drive/getCipher?id=${fileId}`).then((r) =>
    r.json(),
  );

  /* 2) decrypt via KMS, get raw bytes */
  const plain = await fetch("http://localhost:4000/decrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyId: meta.keyId,
      iv: meta.iv,
      tag: meta.tag,
      cipher: meta.cipher,
    }),
  }).then((r) => r.arrayBuffer());

  return new Blob([plain], { type: "application/octet-stream" });
}
