// Crypto module tests
const crypto = require('crypto');
const cryptoModule = require('../../src/crypto/crypto');
const fileEncryptionAPI = require('../../src/crypto/file-encryption');
const fs = require('fs').promises;
const path = require('path');

describe('Crypto Module Tests', () => {
  describe('Basic Crypto Operations', () => {
    test('should generate AES key with correct length', async () => {
      const key = await cryptoModule.generateAESKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // 256 bits = 32 bytes
    });

    test('should generate IV with correct length', async () => {
      const iv = await cryptoModule.generateIV();
      expect(iv).toBeInstanceOf(Buffer);
      expect(iv.length).toBe(12); // 96 bits = 12 bytes
    });

    test('should convert buffer to base64 and back', async () => {
      const buffer = Buffer.from('test data');
      const base64 = cryptoModule.bufferToBase64(buffer);
      expect(typeof base64).toBe('string');
      
      const backToBuffer = cryptoModule.base64ToBuffer(base64);
      expect(backToBuffer).toBeInstanceOf(Buffer);
      expect(backToBuffer.toString()).toBe('test data');
    });
  });

  describe('AES-GCM Encryption/Decryption', () => {
    test('should encrypt and decrypt data with AES-GCM', async () => {
      const testData = 'This is a test string that should be encrypted and then decrypted';
      const key = await cryptoModule.generateAESKey();
      const iv = await cryptoModule.generateIV();

      const { encryptedData, authTag } = await cryptoModule.encryptWithAESGCM(testData, key, iv);
      expect(encryptedData).toBeInstanceOf(Buffer);
      expect(authTag).toBeInstanceOf(Buffer);

      const decryptedData = await cryptoModule.decryptWithAESGCM(encryptedData, key, iv, authTag);
      expect(decryptedData.toString()).toBe(testData);
    });

    test('should throw error on failed authentication', async () => {
      const testData = 'This is a test string that should be encrypted and then decrypted';
      const key = await cryptoModule.generateAESKey();
      const iv = await cryptoModule.generateIV();

      const { encryptedData, authTag } = await cryptoModule.encryptWithAESGCM(testData, key, iv);
      
      // Tamper with authentication tag
      const tamperedTag = Buffer.from(authTag);
      tamperedTag[0] = tamperedTag[0] ^ 1; // Flip one bit
      
      await expect(
        cryptoModule.decryptWithAESGCM(encryptedData, key, iv, tamperedTag)
      ).rejects.toThrow();
    });
  });

  describe('RSA Key Operations', () => {
    let keyPair;

    beforeAll(async () => {
      keyPair = await cryptoModule.generateRSAKeyPair();
    });

    test('should generate RSA key pair', async () => {
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(typeof keyPair.publicKey).toBe('string');
      expect(typeof keyPair.privateKey).toBe('string');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    test('should wrap and unwrap AES key with RSA', async () => {
      const aesKey = await cryptoModule.generateAESKey();
      
      const wrappedKey = await cryptoModule.wrapKeyWithRSA(aesKey, keyPair.publicKey);
      expect(wrappedKey).toBeInstanceOf(Buffer);
      
      const unwrappedKey = await cryptoModule.unwrapKeyWithRSA(wrappedKey, keyPair.privateKey);
      expect(unwrappedKey).toBeInstanceOf(Buffer);
      
      expect(unwrappedKey.toString('hex')).toBe(aesKey.toString('hex'));
    });

    test('should sign and verify data with RSA', async () => {
      const testData = 'Data to be signed and verified';
      
      const signature = await cryptoModule.signWithRSA(testData, keyPair.privateKey);
      expect(signature).toBeInstanceOf(Buffer);
      
      const isValid = await cryptoModule.verifyWithRSA(testData, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
      
      // Test with tampered data
      const isInvalid = await cryptoModule.verifyWithRSA('Tampered data', signature, keyPair.publicKey);
      expect(isInvalid).toBe(false);
    });
  });
});

describe('File Encryption API Tests', () => {
  let rsaKeyPair;
  const testFilePath = path.join(__dirname, '../fixtures/test-encryption.txt');
  const testFileContent = 'This is a test file for encryption and decryption';

  beforeAll(async () => {
    rsaKeyPair = await cryptoModule.generateRSAKeyPair();
    await fs.writeFile(testFilePath, testFileContent);
  });

  test('should encrypt a file', async () => {
    const { encryptedData, encryptionMetadata } = await fileEncryptionAPI.encryptFile(
      testFileContent,
      rsaKeyPair.publicKey
    );
    
    expect(encryptedData).toBeInstanceOf(Buffer);
    expect(encryptionMetadata).toHaveProperty('iv');
    expect(encryptionMetadata).toHaveProperty('tag');
    expect(encryptionMetadata).toHaveProperty('encryptedKey');
    expect(encryptionMetadata).toHaveProperty('algorithm', 'AES-256-GCM');
    expect(encryptionMetadata).toHaveProperty('keyEncryption', 'RSA-OAEP');
  });

  test('should encrypt and decrypt a file', async () => {
    const { encryptedData, encryptionMetadata } = await fileEncryptionAPI.encryptFile(
      testFileContent,
      rsaKeyPair.publicKey
    );
    
    const decryptedData = await fileEncryptionAPI.decryptFile(
      encryptedData,
      encryptionMetadata,
      rsaKeyPair.privateKey
    );
    
    expect(decryptedData.toString()).toBe(testFileContent);
  });

  test('should prepare a file for upload', async () => {
    const result = await fileEncryptionAPI.prepareFileForUpload(
      testFilePath,
      rsaKeyPair.publicKey
    );
    
    expect(result).toHaveProperty('encryptedData');
    expect(result).toHaveProperty('encryptionMetadata');
    expect(result).toHaveProperty('originalName', 'test-encryption.txt');
    expect(result).toHaveProperty('size');
    expect(result).toHaveProperty('mimeType', 'text/plain');
  });

  afterAll(async () => {
    try {
      await fs.unlink(testFilePath);
    } catch (error) {
      console.log('Error cleaning up test file:', error);
    }
  });
});
