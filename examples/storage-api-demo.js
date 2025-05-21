// Storage API Demo with Client-Side Encryption
const path = require('path');
const fs = require('fs').promises;
const cryptoModule = require('../src/crypto/crypto');
const fileEncryptionAPI = require('../src/crypto/file-encryption');
const KMSIntegrationService = require('../src/crypto/kms-integration');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3001';
const KMS_URL = 'http://localhost:3002';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImlhdCI6MTc0NzY0MzI1Nn0.TUWTDJ-aCN8VmaCRT0dvS9731rQcdiRUiglhBq5oFgs';
const USER_ID = '507f1f77bcf86cd799439011';
const EXAMPLE_FILE_PATH = path.join(__dirname, 'test.txt');
const DOWNLOAD_PATH = path.join(__dirname, 'download-test.txt');

/**
 * This demo demonstrates the integration of client-side encryption with the storage API
 * without any frontend dependencies.
 */
async function storageApiDemo() {
  try {
    console.log('=== Secure Drive Storage API Demo with Client-Side Encryption ===\n');

    // 1. Check if services are running
    console.log('1. Checking if services are running...');
    try {
      const storageApiCheck = await fetch(`${API_URL}/api/health`);
      const kmsApiCheck = await fetch(`${KMS_URL}/api/health`);
      
      if (!storageApiCheck.ok || !kmsApiCheck.ok) {
        throw new Error('Services are not running');
      }
      console.log('   Both Storage API and KMS services are running');
    } catch (error) {
      console.error(`   ERROR: Services check failed. Make sure both services are running at ${API_URL} and ${KMS_URL}`);
      console.error('   You need to start both the Storage API and KMS services before running this demo.');
      return;
    }
    
    // 2. Initialize KMS Service
    console.log('\n2. Initializing KMS Service...');
    const kmsService = new KMSIntegrationService(KMS_URL, JWT_TOKEN);
    
    // 3. Initialize or get existing keys
    console.log('\n3. Setting up cryptographic keys...');
    let userKeys;
    try {
      console.log('   Attempting to initialize existing user keys...');
      userKeys = await kmsService.initializeUserKeys(USER_ID);
      console.log('   Successfully retrieved existing keys');
    } catch (error) {
      console.log('   No existing keys found, generating new key pair...');
      userKeys = await kmsService.generateAndRegisterKeyPair();
      console.log('   New key pair generated and registered with KMS');
    }
    console.log(`   Key ID: ${userKeys.keyId}`);
    
    // 4. Create test file if it doesn't exist
    console.log('\n4. Setting up test file...');
    try {
      await fs.access(EXAMPLE_FILE_PATH);
      console.log('   Test file already exists');
    } catch (error) {
      await fs.writeFile(EXAMPLE_FILE_PATH, 'This is a secure test file with sensitive information that will be encrypted before upload.');
      console.log('   Test file created');
    }
    
    // 5. Encrypt file for upload
    console.log('\n5. Encrypting file for upload...');
    const filePreparation = await fileEncryptionAPI.prepareFileForUpload(EXAMPLE_FILE_PATH, userKeys.publicKey);
    console.log('   File encrypted successfully');
    console.log(`   Original name: ${filePreparation.originalName}`);
    console.log(`   Size: ${filePreparation.size} bytes`);
    console.log(`   MIME type: ${filePreparation.mimeType}`);
    console.log('   Encryption metadata:');
    console.log(`     Algorithm: ${filePreparation.encryptionMetadata.algorithm}`);
    console.log(`     Key encryption: ${filePreparation.encryptionMetadata.keyEncryption}`);
    
    // 6. Upload encrypted file
    console.log('\n6. Uploading encrypted file to storage API...');
    const formData = new FormData();
    formData.append('file', filePreparation.encryptedData, {
      filename: filePreparation.originalName,
      contentType: filePreparation.mimeType
    });
    formData.append('encryptionMetadata', JSON.stringify(filePreparation.encryptionMetadata));

    const uploadResponse = await fetch(`${API_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('   File uploaded successfully');
    console.log(`   File ID: ${uploadResult.data._id}`);
    
    // 7. List files to verify upload
    console.log('\n7. Listing files from storage API...');
    const listResponse = await fetch(`${API_URL}/api/files/list`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    if (!listResponse.ok) {
      throw new Error(`File list request failed with status ${listResponse.status}`);
    }

    const listResult = await listResponse.json();
    const files = listResult.data;
    console.log(`   Found ${files.length} files:`);
    files.forEach((file, index) => {
      console.log(`     ${index + 1}. ${file.originalName} (ID: ${file._id})`);
    });
    
    // 8. Download and decrypt file
    const fileId = uploadResult.data._id;
    console.log(`\n8. Downloading file with ID: ${fileId}...`);
    
    const downloadResponse = await fetch(`${API_URL}/api/files/download/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    if (!downloadResponse.ok) {
      throw new Error(`File download failed with status ${downloadResponse.status}`);
    }

    // Get encrypted data as buffer
    const encryptedData = await downloadResponse.buffer();
    console.log('   File downloaded successfully');
    console.log(`   Encrypted size: ${encryptedData.length} bytes`);

    // 9. Get file metadata
    const fileInfo = files.find(file => file._id === fileId);
    if (!fileInfo) {
      throw new Error(`File with ID ${fileId} not found in the file list`);
    }
    
    // 10. Decrypt the file
    console.log('\n10. Decrypting downloaded file...');
    const decryptedData = await fileEncryptionAPI.processDownloadedFile(
      encryptedData,
      fileInfo.encryptionMetadata,
      userKeys.privateKey
    );
    console.log('   File decrypted successfully');
    
    // 11. Save to file
    console.log('\n11. Saving decrypted file...');
    await fs.writeFile(DOWNLOAD_PATH, decryptedData);
    console.log(`   Decrypted file saved to: ${DOWNLOAD_PATH}`);
    
    // 12. Verify content
    console.log('\n12. Verifying decrypted content...');
    const originalContent = await fs.readFile(EXAMPLE_FILE_PATH, 'utf8');
    const decryptedContent = await fs.readFile(DOWNLOAD_PATH, 'utf8');
    console.log('   Original content:', originalContent);
    console.log('   Decrypted content:', decryptedContent);
    
    const contentMatch = originalContent === decryptedContent;
    console.log(`   Content match: ${contentMatch ? 'YES' : 'NO'}`);
    
    // 13. Demonstrate file sharing (optional, if you have another user in the system)
    console.log('\n13. File sharing demonstration...');
    console.log('   Note: This step would require another user in the system');
    console.log('   To share a file:');
    console.log('   1. Get target user\'s public key from KMS');
    console.log('   2. Decrypt the file\'s AES key using current user\'s private key');
    console.log('   3. Re-encrypt the AES key with target user\'s public key');
    console.log('   4. Create new encryption metadata for target user');
    console.log('   5. Register sharing with KMS and update permissions on storage API');
    
    // Summary
    console.log('\n=== Storage API Demo Summary ===');
    console.log('1. Initialized KMS service and retrieved user keys');
    console.log('2. Encrypted file using AES-GCM with authentication');
    console.log('3. Uploaded encrypted file to storage API');
    console.log('4. Retrieved file listing from storage API');
    console.log('5. Downloaded encrypted file from storage API');
    console.log('6. Decrypted file using RSA key unwrapping and AES-GCM');
    console.log('7. Verified file content integrity');
    
    if (contentMatch) {
      console.log('\n✅ Storage API integration with client-side encryption completed successfully!');
    } else {
      console.log('\n❌ Content verification failed! The decrypted content does not match the original.');
    }
    
  } catch (error) {
    console.error('Error in storage API demo:', error);
  }
}

// Run the demo
if (require.main === module) {
  storageApiDemo();
}

module.exports = { storageApiDemo };
