import {
  generateRsaKeyPair,
  encryptFile,
  decryptFile
} from "../index";

describe("AES-GCM + RSA-OAEP round-trip", () => {
  it("should decrypt back to the original plaintext", async () => {
    const { publicKey, privateKey } = await generateRsaKeyPair();

    // 任意 UTF-8 明文
    const plaintext = new TextEncoder().encode("測試用明文 🦄 123");

    // Encrypt  ➜  Decrypt
    const packet    = await encryptFile(plaintext, publicKey);
    const recovered = await decryptFile(packet, privateKey);

    // 驗證完全還原
    expect(recovered).toEqual(plaintext);
  });
});
