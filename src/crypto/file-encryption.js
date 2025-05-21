// File encryption and decryption API
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const cryptoModule = require('./crypto');

/**
 * A file-focused encryption and decryption API that integrates with the KMS service
 */
const fileEncryptionAPI = {
  /**
   * Encrypt a file with AES-GCM and wrap the AES key with RSA
   * @param {string|Buffer} fileData - File content to encrypt
   * @param {string} publicKeyPem - RSA public key in PEM format for key wrapping
   * @returns {Promise<Object>} Encryption result with metadata
   */
  encryptFile: async (fileData, publicKeyPem) => {
    try {
      // Generate AES key and IV
      const aesKey = await cryptoModule.generateAESKey();
      const iv = await cryptoModule.generateIV();
      
      // Convert file data to buffer if it's a string
      const fileBuffer = typeof fileData === 'string' ? Buffer.from(fileData) : fileData;
      
      // Encrypt file with AES-GCM
      const { encryptedData, authTag } = await cryptoModule.encryptWithAESGCM(
        fileBuffer,
        aesKey,
        iv
      );
      
      // Wrap (encrypt) the AES key with the RSA public key
      const wrappedKey = await cryptoModule.wrapKeyWithRSA(aesKey, publicKeyPem);
      
      // Prepare metadata for storage
      const encryptionMetadata = {
        iv: cryptoModule.bufferToBase64(iv),
        tag: cryptoModule.bufferToBase64(authTag),
        encryptedKey: cryptoModule.bufferToBase64(wrappedKey),
        algorithm: 'AES-256-GCM',
        keyEncryption: 'RSA-OAEP'
      };
      
      return {
        encryptedData,
        encryptionMetadata
      };
    } catch (error) {
      throw new Error(`File encryption failed: ${error.message}`);
    }
  },
  
  /**
   * Decrypt a file using AES-GCM after unwrapping the AES key with RSA
   * @param {Buffer} encryptedData - Encrypted file content
   * @param {Object} metadata - Encryption metadata
   * @param {string} privateKeyPem - RSA private key in PEM format for key unwrapping
   * @returns {Promise<Buffer>} Decrypted file content
   */
  decryptFile: async (encryptedData, metadata, privateKeyPem) => {
    try {
      // Extract metadata
      const iv = cryptoModule.base64ToBuffer(metadata.iv);
      const authTag = cryptoModule.base64ToBuffer(metadata.tag);
      const wrappedKey = cryptoModule.base64ToBuffer(metadata.encryptedKey);
      
      // Unwrap (decrypt) the AES key with the RSA private key
      const aesKey = await cryptoModule.unwrapKeyWithRSA(wrappedKey, privateKeyPem);
      
      // Decrypt the file with the AES key and IV
      const decryptedData = await cryptoModule.decryptWithAESGCM(
        encryptedData,
        aesKey,
        iv,
        authTag
      );
      
      return decryptedData;
    } catch (error) {
      throw new Error(`File decryption failed: ${error.message}`);
    }
  },
  
  /**
   * Process a file for upload (encrypt and prepare for API)
   * @param {string} filePath - Path to the file to encrypt
   * @param {string} publicKeyPem - RSA public key in PEM format
   * @returns {Promise<Object>} Object with encrypted data and metadata for upload
   */
  prepareFileForUpload: async (filePath, publicKeyPem) => {
    try {
      // Read file
      const fileData = await fs.readFile(filePath);
      
      // Encrypt file
      const { encryptedData, encryptionMetadata } = await fileEncryptionAPI.encryptFile(
        fileData,
        publicKeyPem
      );
      
      return {
        encryptedData,
        encryptionMetadata,
        originalName: path.basename(filePath),
        size: fileData.length,
        mimeType: fileEncryptionAPI.getMimeType(filePath)
      };
    } catch (error) {
      throw new Error(`Failed to prepare file for upload: ${error.message}`);
    }
  },
  
  /**
   * Process a downloaded file (decrypt)
   * @param {Buffer} encryptedData - Encrypted file content
   * @param {Object} metadata - Encryption metadata
   * @param {string} privateKeyPem - RSA private key in PEM format
   * @returns {Promise<Buffer>} Decrypted file content
   */
  processDownloadedFile: async (encryptedData, metadata, privateKeyPem) => {
    return fileEncryptionAPI.decryptFile(encryptedData, metadata, privateKeyPem);
  },
  
  /**
   * Create a content blob from decrypted data
   * @param {Buffer} decryptedData - Decrypted file content
   * @param {string} mimeType - MIME type of the file
   * @returns {Blob} Blob object for browser download or display
   */
  createDownloadBlob: (decryptedData, mimeType) => {
    return new Blob([decryptedData], { type: mimeType });
  },
  
  /**
   * Get MIME type from file extension
   * @param {string} filePath - Path to the file
   * @returns {string} MIME type
   */
  getMimeType: (filePath) => {
    const extension = path.extname(filePath).toLowerCase();
    
    const mimeTypes = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wav': 'audio/wav'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
};

module.exports = fileEncryptionAPI;
