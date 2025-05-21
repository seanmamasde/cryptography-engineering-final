// Web Crypto API module for browser environments
/**
 * A module for client-side encryption and decryption using Web Crypto API
 * Provides a clean interface for AES-GCM encryption and RSA key wrapping operations
 */
const webCryptoModule = {
  /**
   * Generate a random AES key (256-bit)
   * @returns {Promise<CryptoKey>} Generated AES key
   */
  generateAESKey: async () => {
    try {
      return await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error(`AES key generation failed: ${error.message}`);
    }
  },

  /**
   * Generate a random Initialization Vector (96-bit) for AES-GCM
   * @returns {Uint8Array} Generated IV
   */
  generateIV: () => {
    return window.crypto.getRandomValues(new Uint8Array(12)); // 96 bits = 12 bytes
  },

  /**
   * Convert ArrayBuffer to Base64 string
   * @param {ArrayBuffer} buffer - Buffer to convert
   * @returns {string} Base64 encoded string
   */
  arrayBufferToBase64: (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  },

  /**
   * Convert Base64 string to ArrayBuffer
   * @param {string} base64 - Base64 string to convert
   * @returns {ArrayBuffer} Decoded ArrayBuffer
   */
  base64ToArrayBuffer: (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  },
  
  /**
   * Export an AES key to raw format
   * @param {CryptoKey} key - AES key to export
   * @returns {Promise<ArrayBuffer>} Raw key data
   */
  exportAESKey: async (key) => {
    try {
      return await window.crypto.subtle.exportKey('raw', key);
    } catch (error) {
      throw new Error(`AES key export failed: ${error.message}`);
    }
  },
  
  /**
   * Import an AES key from raw format
   * @param {ArrayBuffer} rawKey - Raw key data
   * @returns {Promise<CryptoKey>} Imported AES key
   */
  importAESKey: async (rawKey) => {
    try {
      return await window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false, // extractable
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error(`AES key import failed: ${error.message}`);
    }
  },
  
  /**
   * Encrypt data using AES-GCM algorithm
   * @param {ArrayBuffer|string} data - Data to encrypt
   * @param {CryptoKey} key - AES key
   * @param {Uint8Array} iv - Initialization Vector (12 bytes/96 bits)
   * @returns {Promise<Object>} Object with encrypted data and authentication tag
   */
  encryptWithAESGCM: async (data, key, iv) => {
    try {
      // Convert string data to ArrayBuffer if needed
      const dataBuffer = typeof data === 'string' 
        ? new TextEncoder().encode(data) 
        : data;
      
      // Encrypt data with AES-GCM
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          tagLength: 128 // Auth tag length in bits
        },
        key,
        dataBuffer
      );
      
      // AES-GCM includes the authentication tag at the end of the ciphertext
      // We need to separate it for our API
      
      // Get the encrypted data (without the tag)
      const encryptedLength = encryptedData.byteLength - 16; // 16 bytes = 128-bit tag
      const ciphertext = encryptedData.slice(0, encryptedLength);
      
      // Get the authentication tag (last 16 bytes)
      const authTag = encryptedData.slice(encryptedLength);
      
      return {
        encryptedData: ciphertext,
        authTag,
        iv
      };
    } catch (error) {
      throw new Error(`AES-GCM encryption failed: ${error.message}`);
    }
  },
  
  /**
   * Decrypt data using AES-GCM algorithm
   * @param {ArrayBuffer} encryptedData - Encrypted data
   * @param {CryptoKey} key - AES key
   * @param {Uint8Array} iv - Initialization Vector (12 bytes/96 bits)
   * @param {ArrayBuffer} authTag - Authentication tag
   * @returns {Promise<ArrayBuffer>} Decrypted data
   */
  decryptWithAESGCM: async (encryptedData, key, iv, authTag) => {
    try {
      // Combine ciphertext and authentication tag for Web Crypto API
      const combinedData = new Uint8Array(encryptedData.byteLength + authTag.byteLength);
      combinedData.set(new Uint8Array(encryptedData), 0);
      combinedData.set(new Uint8Array(authTag), encryptedData.byteLength);
      
      // Decrypt data with AES-GCM
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          tagLength: 128 // Auth tag length in bits
        },
        key,
        combinedData
      );
      
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
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
          hash: 'SHA-256'
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      // Export the public key to SPKI format
      const publicKeySpki = await window.crypto.subtle.exportKey(
        'spki',
        keyPair.publicKey
      );
      
      // Export the private key to PKCS8 format
      const privateKeyPkcs8 = await window.crypto.subtle.exportKey(
        'pkcs8',
        keyPair.privateKey
      );
      
      return {
        publicKey: publicKeySpki,
        privateKey: privateKeyPkcs8,
        cryptoKeyPair: keyPair
      };
    } catch (error) {
      throw new Error(`RSA key pair generation failed: ${error.message}`);
    }
  },
  
  /**
   * Import an RSA public key from SPKI format
   * @param {ArrayBuffer} publicKeySpki - Public key in SPKI format
   * @returns {Promise<CryptoKey>} Imported RSA public key
   */
  importRSAPublicKey: async (publicKeySpki) => {
    try {
      return await window.crypto.subtle.importKey(
        'spki',
        publicKeySpki,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false, // extractable
        ['encrypt']
      );
    } catch (error) {
      throw new Error(`RSA public key import failed: ${error.message}`);
    }
  },
  
  /**
   * Import an RSA private key from PKCS8 format
   * @param {ArrayBuffer} privateKeyPkcs8 - Private key in PKCS8 format
   * @returns {Promise<CryptoKey>} Imported RSA private key
   */
  importRSAPrivateKey: async (privateKeyPkcs8) => {
    try {
      return await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyPkcs8,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false, // extractable
        ['decrypt']
      );
    } catch (error) {
      throw new Error(`RSA private key import failed: ${error.message}`);
    }
  },
  
  /**
   * Wrap (encrypt) an AES key using RSA public key
   * @param {CryptoKey} aesKey - AES key to wrap
   * @param {CryptoKey} publicKey - RSA public key
   * @returns {Promise<ArrayBuffer>} Wrapped (encrypted) AES key
   */
  wrapKeyWithRSA: async (aesKey, publicKey) => {
    try {
      // First export the AES key to raw format
      const rawAesKey = await webCryptoModule.exportAESKey(aesKey);
      
      // Encrypt (wrap) the raw AES key with RSA-OAEP
      return await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        publicKey,
        rawAesKey
      );
    } catch (error) {
      throw new Error(`RSA key wrapping failed: ${error.message}`);
    }
  },
  
  /**
   * Unwrap (decrypt) an AES key using RSA private key
   * @param {ArrayBuffer} wrappedKey - Wrapped (encrypted) AES key
   * @param {CryptoKey} privateKey - RSA private key
   * @returns {Promise<CryptoKey>} Unwrapped (decrypted) AES key
   */
  unwrapKeyWithRSA: async (wrappedKey, privateKey) => {
    try {
      // Decrypt (unwrap) the AES key with RSA-OAEP
      const rawAesKey = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        privateKey,
        wrappedKey
      );
      
      // Import the raw AES key
      return await webCryptoModule.importAESKey(rawAesKey);
    } catch (error) {
      throw new Error(`RSA key unwrapping failed: ${error.message}`);
    }
  },
  
  /**
   * Sign data using RSA-PSS
   * @param {ArrayBuffer|string} data - Data to sign
   * @param {CryptoKey} privateKey - RSA private key
   * @returns {Promise<ArrayBuffer>} Signature
   */
  signWithRSA: async (data, privateKey) => {
    try {
      // Convert string data to ArrayBuffer if needed
      const dataBuffer = typeof data === 'string' 
        ? new TextEncoder().encode(data) 
        : data;
      
      // Import the private key for signing if it's not already a CryptoKey
      let signingKey = privateKey;
      if (!(privateKey instanceof CryptoKey)) {
        signingKey = await window.crypto.subtle.importKey(
          'pkcs8',
          privateKey,
          {
            name: 'RSA-PSS',
            hash: 'SHA-256'
          },
          false, // extractable
          ['sign']
        );
      }
      
      // Sign data with RSA-PSS
      return await window.crypto.subtle.sign(
        {
          name: 'RSA-PSS',
          saltLength: 32
        },
        signingKey,
        dataBuffer
      );
    } catch (error) {
      throw new Error(`RSA signing failed: ${error.message}`);
    }
  },
  
  /**
   * Verify signature using RSA-PSS
   * @param {ArrayBuffer|string} data - Data to verify
   * @param {ArrayBuffer} signature - Signature to verify
   * @param {CryptoKey} publicKey - RSA public key
   * @returns {Promise<boolean>} Verification result
   */
  verifyWithRSA: async (data, signature, publicKey) => {
    try {
      // Convert string data to ArrayBuffer if needed
      const dataBuffer = typeof data === 'string' 
        ? new TextEncoder().encode(data) 
        : data;
      
      // Import the public key for verification if it's not already a CryptoKey
      let verificationKey = publicKey;
      if (!(publicKey instanceof CryptoKey)) {
        verificationKey = await window.crypto.subtle.importKey(
          'spki',
          publicKey,
          {
            name: 'RSA-PSS',
            hash: 'SHA-256'
          },
          false, // extractable
          ['verify']
        );
      }
      
      // Verify signature with RSA-PSS
      return await window.crypto.subtle.verify(
        {
          name: 'RSA-PSS',
          saltLength: 32
        },
        verificationKey,
        signature,
        dataBuffer
      );
    } catch (error) {
      throw new Error(`RSA verification failed: ${error.message}`);
    }
  }
};

// Export for browser environments
if (typeof window !== 'undefined') {
  window.webCryptoModule = webCryptoModule;
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = webCryptoModule;
}

// Export for ES modules
if (typeof exports !== 'undefined') {
  exports.webCryptoModule = webCryptoModule;
}
