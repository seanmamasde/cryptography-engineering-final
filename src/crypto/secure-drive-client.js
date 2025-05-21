// SecureDrive Client API
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const fileEncryptionAPI = require('./file-encryption');
const KMSIntegrationService = require('./kms-integration');
const cryptoModule = require('./crypto');

/**
 * Main SecureDrive Client API that integrates file operations, encryption, and KMS
 */
class SecureDriveClientAPI {
  /**
   * Create a new SecureDrive client
   * @param {Object} config - Configuration options
   * @param {string} config.apiUrl - Storage API URL
   * @param {string} config.kmsUrl - KMS API URL
   */
  constructor(config) {
    this.apiUrl = config.apiUrl || 'http://localhost:3001';
    this.kmsUrl = config.kmsUrl || 'http://localhost:3002';
    this.token = null;
    this.kmsService = new KMSIntegrationService(this.kmsUrl, null);
  }

  /**
   * Set authentication token for API access
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
    this.kmsService.setToken(token);
  }

  /**
   * Initialize the client after user login
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(userId) {
    try {
      let userKeys;
      
      try {
        // Try to initialize existing keys
        userKeys = await this.kmsService.initializeUserKeys(userId);
      } catch (error) {
        // If keys don't exist, generate and register new ones
        userKeys = await this.kmsService.generateAndRegisterKeyPair();
      }
      
      return {
        initialized: true,
        keyId: userKeys.keyId
      };
    } catch (error) {
      throw new Error(`SecureDrive client initialization failed: ${error.message}`);
    }
  }

  /**
   * Upload an encrypted file
   * @param {string} filePath - Path to the file to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(filePath) {
    try {
      // Get current user's keys
      const userKeys = this.kmsService.getCurrentUserKeys();

      // Prepare file for upload (encrypt it)
      const {
        encryptedData,
        encryptionMetadata,
        originalName,
        size,
        mimeType
      } = await fileEncryptionAPI.prepareFileForUpload(filePath, userKeys.publicKey);

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', encryptedData, {
        filename: originalName,
        contentType: mimeType
      });
      formData.append('encryptionMetadata', JSON.stringify(encryptionMetadata));

      // Upload to server
      const response = await fetch(`${this.apiUrl}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Get list of user's files
   * @returns {Promise<Array>} List of files
   */
  async listFiles() {
    try {
      const response = await fetch(`${this.apiUrl}/api/files/list`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`File list request failed with status ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      throw new Error(`Failed to get file list: ${error.message}`);
    }
  }

  /**
   * Download and decrypt a file
   * @param {string} fileId - File ID to download
   * @param {string} [savePath=null] - Optional path to save the decrypted file
   * @returns {Promise<Object>} Download result with decrypted data
   */
  async downloadFile(fileId, savePath = null) {
    try {
      // Get current user's keys
      const userKeys = this.kmsService.getCurrentUserKeys();

      // First get the file metadata to access encryption details
      const files = await this.listFiles();
      const fileInfo = files.find(file => file._id === fileId);
      
      if (!fileInfo) {
        throw new Error(`File with ID ${fileId} not found`);
      }

      // Download encrypted file
      const response = await fetch(`${this.apiUrl}/api/files/download/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`File download failed with status ${response.status}`);
      }

      // Get encrypted data as buffer
      const encryptedData = await response.buffer();

      // Decrypt the file
      const decryptedData = await fileEncryptionAPI.processDownloadedFile(
        encryptedData,
        fileInfo.encryptionMetadata,
        userKeys.privateKey
      );

      // Save to file if path is provided
      if (savePath) {
        await fs.writeFile(savePath, decryptedData);
      }

      return {
        success: true,
        fileId,
        originalName: fileInfo.originalName,
        mimeType: fileInfo.mimeType,
        decryptedData
      };
    } catch (error) {
      throw new Error(`File download and decryption failed: ${error.message}`);
    }
  }

  /**
   * Share file access with another user
   * @param {string} fileId - File ID to share
   * @param {string} targetUserId - User ID to share with
   * @param {string} permission - Permission type ('read' or 'write')
   * @returns {Promise<Object>} Sharing result
   */
  async shareFile(fileId, targetUserId, permission) {
    try {
      // Get file metadata to access encryption details
      const files = await this.listFiles();
      const fileInfo = files.find(file => file._id === fileId);
      
      if (!fileInfo) {
        throw new Error(`File with ID ${fileId} not found`);
      }

      // Share file access via KMS service
      const sharingResult = await this.kmsService.shareFileAccess(
        fileId,
        targetUserId,
        permission,
        fileInfo.encryptionMetadata
      );

      // Update file permissions on storage API
      const updateResponse = await fetch(`${this.apiUrl}/api/files/${fileId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          targetUserId,
          permission
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`Permission update failed with status ${updateResponse.status}`);
      }

      const updateResult = await updateResponse.json();
      
      return {
        success: true,
        fileId,
        targetUserId,
        permission,
        kmsResult: sharingResult,
        permissionResult: updateResult
      };
    } catch (error) {
      throw new Error(`File sharing failed: ${error.message}`);
    }
  }

  /**
   * Delete a file
   * @param {string} fileId - File ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(fileId) {
    try {
      const response = await fetch(`${this.apiUrl}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`File deletion failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }
}

module.exports = SecureDriveClientAPI;
