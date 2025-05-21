export class CryptoModuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoModuleError";
  }
}
