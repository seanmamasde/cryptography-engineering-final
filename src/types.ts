// Defining types for encryption/decryption operations
export interface EncryptResponse {
  keyId: string;
  iv: string; // base64
  tag: string; // base64
  cipher: string; // base64
}

export interface DecryptRequest {
  keyId: string;
  iv: string;
  tag: string;
  cipher: string;
}
