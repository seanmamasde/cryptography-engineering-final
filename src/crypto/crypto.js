// Core cryptographic operations module
const crypto = require('crypto');

/**
 * A module for client-side encryption and decryption using Web Crypto API and Node crypto module
 * Provides a clean interface for AES-GCM encryption and RSA key wrapping operations
 */
const cryptoModule = {
  /**
   * Generate a random AES key (256-bit)
   * @returns {Promise<Buffer>} Generated AES key as Buffer
   */
  generateAESKey: async () => {
    return crypto.randomBytes(32); // 256 bits = 32 bytes
  },

  /**
   * Generate a random Initialization Vector (96-bit) for AES-GCM
   * @returns {Promise<Buffer>} Generated IV as Buffer
   */
  generateIV: async () => {
    return crypto.randomBytes(12); // 96 bits = 12 bytes
  },

  /**
   * Convert Buffer to Base64 string
   * @param {Buffer} buffer - Buffer to convert
   * @returns {string} Base64 encoded string
   */
  bufferToBase64: (buffer) => {
    return buffer.toString('base64');
  },

  /**
   * Convert Base64 string to Buffer
   * @param {string} base64 - Base64 string to convert
   * @returns {Buffer} Decoded Buffer
   */
  base64ToBuffer: (base64) => {
    return Buffer.from(base64, 'base64');
  },
  
  /**
   * Encrypt data using AES-GCM algorithm
   * @param {Buffer|string} data - Data to encrypt
   * @param {Buffer} key - AES key (32 bytes/256 bits)
   * @param {Buffer} iv - Initialization Vector (12 bytes/96 bits)
   * @returns {Promise<Object>} Object containing encrypted data, authentication tag and IV
   */
  encryptWithAESGCM: async (data, key, iv) => {
    try {
      // Convert string data to buffer if needed
      const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      // Encrypt data
      const encryptedData = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final()
      ]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedData,
        authTag,
        iv
      };
    } catch (error) {
      throw new Error(`AES-GCM encryption failed: ${error.message}`);
    }
  },
  
  /**
   * Decrypt data using AES-GCM algorithm
   * @param {Buffer} encryptedData - Encrypted data
   * @param {Buffer} key - AES key (32 bytes/256 bits)
   * @param {Buffer} iv - Initialization Vector (12 bytes/96 bits)
   * @param {Buffer} authTag - Authentication tag
   * @returns {Promise<Buffer>} Decrypted data
   */
  decryptWithAESGCM: async (encryptedData, key, iv, authTag) => {
    try {
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      
      // Set authentication tag
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      const decryptedData = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      return decryptedData;
    } catch (error) {
      throw new Error(`AES-GCM decryption failed (authentication may have failed): ${error.message}`);
    }
  },
  
  /**
   * Generate RSA key pair
   * @param {number} [modulusLength=2048] - RSA key size in bits
   * @returns {Promise<Object>} Object containing public and private keys
   */
  generateRSAKeyPair: async (modulusLength = 2048) => {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('rsa', {
        modulusLength,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, (err, publicKey, privateKey) => {
        if (err) {
          reject(new Error(`RSA key pair generation failed: ${err.message}`));
        } else {
          resolve({ publicKey, privateKey });
        }
      });
    });
  },
  
  /**
   * Wrap (encrypt) an AES key using RSA public key
   * @param {Buffer} aesKey - AES key to wrap
   * @param {string} publicKeyPem - RSA public key in PEM format
   * @returns {Promise<Buffer>} Wrapped (encrypted) AES key
   */
  wrapKeyWithRSA: async (aesKey, publicKeyPem) => {
    try {
      const encryptedKey = crypto.publicEncrypt(
        {
          key: publicKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        aesKey
      );
      
      return encryptedKey;
    } catch (error) {
      throw new Error(`RSA key wrapping failed: ${error.message}`);
    }
  },
  
  /**
   * Unwrap (decrypt) an AES key using RSA private key
   * @param {Buffer} wrappedKey - Wrapped (encrypted) AES key
   * @param {string} privateKeyPem - RSA private key in PEM format
   * @returns {Promise<Buffer>} Unwrapped (decrypted) AES key
   */
  unwrapKeyWithRSA: async (wrappedKey, privateKeyPem) => {
    try {
      const decryptedKey = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        wrappedKey
      );
      
      return decryptedKey;
    } catch (error) {
      throw new Error(`RSA key unwrapping failed: ${error.message}`);
    }
  },
  
  /**
   * Sign data using RSA private key
   * @param {Buffer|string} data - Data to sign
   * @param {string} privateKeyPem - RSA private key in PEM format
   * @returns {Promise<Buffer>} Signature
   */
  signWithRSA: async (data, privateKeyPem) => {
    try {
      const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
      
      const sign = crypto.createSign('SHA256');
      sign.update(dataBuffer);
      sign.end();
      
      const signature = sign.sign(privateKeyPem);
      return signature;
    } catch (error) {
      throw new Error(`RSA signing failed: ${error.message}`);
    }
  },
  
  /**
   * Verify signature using RSA public key
   * @param {Buffer|string} data - Data to verify
   * @param {Buffer} signature - Signature to verify
   * @param {string} publicKeyPem - RSA public key in PEM format
   * @returns {Promise<boolean>} Verification result
   */
  verifyWithRSA: async (data, signature, publicKeyPem) => {
    try {
      const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
      
      const verify = crypto.createVerify('SHA256');
      verify.update(dataBuffer);
      verify.end();
      
      return verify.verify(publicKeyPem, signature);
    } catch (error) {
      throw new Error(`RSA verification failed: ${error.message}`);
    }
  }
};

module.exports = cryptoModule;
