// KMS Integration Service
const fetch = require('node-fetch');
const cryptoModule = require('./crypto');

/**
 * Service for integrating with the Key Management Service (KMS)
 * Handles key management operations and permissions
 */
class KMSIntegrationService {
  /**
   * Create a KMS integration service
   * @param {string} kmsUrl - URL of the KMS server
   * @param {string} token - Authentication token
   */
  constructor(kmsUrl, token) {
    this.kmsUrl = kmsUrl;
    this.token = token;
    this.userKeys = null;
  }

  /**
   * Set authentication token
   * @param {string} token - Authentication token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Initialize user keys after login
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User keys
   */
  async initializeUserKeys(userId) {
    try {
      const response = await fetch(`${this.kmsUrl}/api/keys/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`KMS initialization failed with status ${response.status}`);
      }

      this.userKeys = await response.json();
      return this.userKeys;
    } catch (error) {
      throw new Error(`KMS key initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate new RSA key pair and register with KMS
   * @returns {Promise<Object>} Generated key pair
   */
  async generateAndRegisterKeyPair() {
    try {
      // Generate RSA key pair
      const keyPair = await cryptoModule.generateRSAKeyPair(2048);
      
      // Register public key with KMS
      const response = await fetch(`${this.kmsUrl}/api/keys/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          publicKey: keyPair.publicKey
        })
      });

      if (!response.ok) {
        throw new Error(`KMS key registration failed with status ${response.status}`);
      }

      const result = await response.json();
      
      // Store key pair locally (the private key is never sent to server)
      this.userKeys = {
        keyId: result.keyId,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };

      return this.userKeys;
    } catch (error) {
      throw new Error(`Key pair generation and registration failed: ${error.message}`);
    }
  }

  /**
   * Get RSA public key for a specific user
   * @param {string} userId - User ID to get public key for
   * @returns {Promise<string>} RSA public key in PEM format
   */
  async getUserPublicKey(userId) {
    try {
      const response = await fetch(`${this.kmsUrl}/api/keys/public/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get user public key with status ${response.status}`);
      }

      const result = await response.json();
      return result.publicKey;
    } catch (error) {
      throw new Error(`Failed to get user public key: ${error.message}`);
    }
  }

  /**
   * Request access to file encryption key
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Permission response
   */
  async requestFileKeyAccess(fileId) {
    try {
      const response = await fetch(`${this.kmsUrl}/api/keys/files/${fileId}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Key access request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to request file key access: ${error.message}`);
    }
  }

  /**
   * Share file access with another user
   * @param {string} fileId - File ID
   * @param {string} targetUserId - User ID to share with
   * @param {string} permission - Permission type ('read' or 'write')
   * @param {Object} encryptionMetadata - File encryption metadata
   * @returns {Promise<Object>} Sharing response
   */
  async shareFileAccess(fileId, targetUserId, permission, encryptionMetadata) {
    try {
      // Get target user's public key
      const targetPublicKey = await this.getUserPublicKey(targetUserId);
      
      // Decrypt the file's AES key using current user's private key
      const wrappedKey = cryptoModule.base64ToBuffer(encryptionMetadata.encryptedKey);
      const aesKey = await cryptoModule.unwrapKeyWithRSA(
        wrappedKey,
        this.userKeys.privateKey
      );
      
      // Re-encrypt the AES key with target user's public key
      const reWrappedKey = await cryptoModule.wrapKeyWithRSA(aesKey, targetPublicKey);
      
      // Create new encryption metadata for target user
      const targetEncryptionMetadata = {
        iv: encryptionMetadata.iv,
        tag: encryptionMetadata.tag,
        encryptedKey: cryptoModule.bufferToBase64(reWrappedKey),
        algorithm: encryptionMetadata.algorithm,
        keyEncryption: encryptionMetadata.keyEncryption
      };
      
      // Register sharing with KMS
      const response = await fetch(`${this.kmsUrl}/api/keys/files/${fileId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          targetUserId,
          permission,
          encryptionMetadata: targetEncryptionMetadata
        })
      });

      if (!response.ok) {
        throw new Error(`File sharing failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to share file access: ${error.message}`);
    }
  }

  /**
   * Get current user's RSA key pair
   * @returns {Object} User's RSA key pair
   */
  getCurrentUserKeys() {
    if (!this.userKeys) {
      throw new Error('User keys are not initialized. Call initializeUserKeys first.');
    }
    
    return this.userKeys;
  }
}

module.exports = KMSIntegrationService;
