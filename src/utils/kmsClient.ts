import type { EncryptResponse } from "../types";

export async function encryptViaKms(file: File): Promise<EncryptResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("http://localhost:4000/encrypt", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("KMS encrypt failed");
  return res.json();
}

// little helper to turn a base64 string into a Blob
export function b64ToBlob(b64: string) {
  return new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))]);
}
