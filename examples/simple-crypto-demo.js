// Simple Crypto Demo - No Frontend Dependencies
const path = require('path');
const fs = require('fs').promises;
const cryptoModule = require('../src/crypto/crypto');

/**
 * This is a simplified demo that focuses only on the encryption/decryption functionality
 * without any frontend integrations.
 */
async function simpleCryptoDemo() {
  try {
    console.log('=== Secure Drive Crypto Module Demo ===\n');
    
    // Create a test file if it doesn't exist
    console.log('1. Setting up test file...');
    const testFilePath = path.join(__dirname, 'crypto-test.txt');
    try {
      await fs.access(testFilePath);
      console.log('   Test file already exists');
    } catch (error) {
      await fs.writeFile(testFilePath, 'This is a sensitive file that will be encrypted using AES-GCM and key wrapping.');
      console.log('   Test file created successfully');
    }
    
    // Read file content
    console.log('\n2. Reading file content...');
    const fileContent = await fs.readFile(testFilePath, 'utf8');
    console.log(`   Original content: ${fileContent}`);
    
    // Generate AES key and IV
    console.log('\n3. Generating cryptographic materials...');
    const aesKey = await cryptoModule.generateAESKey();
    console.log(`   AES Key (base64): ${cryptoModule.bufferToBase64(aesKey)}`);
    
    const iv = await cryptoModule.generateIV();
    console.log(`   IV (base64): ${cryptoModule.bufferToBase64(iv)}`);
    
    // Generate RSA key pair
    console.log('\n4. Generating RSA key pair for key wrapping...');
    const { publicKey, privateKey } = await cryptoModule.generateRSAKeyPair();
    console.log('   RSA key pair generated successfully');
    console.log('   Public key:', publicKey.substring(0, 64) + '...');
    console.log('   Private key:', privateKey.substring(0, 64) + '...');
    
    // Encrypt the file content with AES-GCM
    console.log('\n5. Encrypting file with AES-GCM...');
    const { encryptedData, authTag } = await cryptoModule.encryptWithAESGCM(
      fileContent,
      aesKey,
      iv
    );
    console.log(`   Encrypted data (base64): ${encryptedData.toString('base64').substring(0, 64)}...`);
    console.log(`   Authentication tag (base64): ${authTag.toString('base64')}`);
    
    // Wrap the AES key with RSA
    console.log('\n6. Wrapping AES key with RSA public key...');
    const wrappedKey = await cryptoModule.wrapKeyWithRSA(aesKey, publicKey);
    console.log(`   Wrapped key (base64): ${wrappedKey.toString('base64').substring(0, 64)}...`);
    
    // Save the encrypted file
    console.log('\n7. Saving encrypted file...');
    const encryptedFilePath = path.join(__dirname, 'encrypted-test.bin');
    await fs.writeFile(encryptedFilePath, encryptedData);
    console.log(`   Encrypted file saved to: ${encryptedFilePath}`);
    
    // Save metadata for later decryption
    console.log('\n8. Saving encryption metadata...');
    const metadata = {
      iv: cryptoModule.bufferToBase64(iv),
      tag: cryptoModule.bufferToBase64(authTag),
      encryptedKey: cryptoModule.bufferToBase64(wrappedKey),
      algorithm: 'AES-256-GCM',
      keyEncryption: 'RSA-OAEP'
    };
    const metadataPath = path.join(__dirname, 'encryption-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`   Metadata saved to: ${metadataPath}`);
    
    // Demonstrate decryption flow
    console.log('\n9. Demonstrating decryption flow...');
    
    // Read encrypted file and metadata
    console.log('   Reading encrypted file and metadata...');
    const encryptedFileContent = await fs.readFile(encryptedFilePath);
    const savedMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    
    // Unwrap AES key with RSA private key
    console.log('\n10. Unwrapping AES key with RSA private key...');
    const unwrappedKey = await cryptoModule.unwrapKeyWithRSA(
      cryptoModule.base64ToBuffer(savedMetadata.encryptedKey),
      privateKey
    );
    console.log('   AES key unwrapped successfully');
    
    // Verify the unwrapped key matches the original AES key
    console.log('   Verifying key integrity...');
    const keysMatch = Buffer.compare(aesKey, unwrappedKey) === 0;
    console.log(`   Keys match: ${keysMatch ? 'YES' : 'NO'}`);
    
    // Decrypt data
    console.log('\n11. Decrypting file with AES-GCM...');
    const decryptedData = await cryptoModule.decryptWithAESGCM(
      encryptedFileContent,
      unwrappedKey,
      cryptoModule.base64ToBuffer(savedMetadata.iv),
      cryptoModule.base64ToBuffer(savedMetadata.tag)
    );
    console.log(`   Decrypted data: ${decryptedData.toString('utf8')}`);
    
    // Verify decryption was successful
    console.log('\n12. Verifying decryption...');
    const isDecryptionSuccessful = fileContent === decryptedData.toString('utf8');
    console.log(`   Decryption successful: ${isDecryptionSuccessful ? 'YES' : 'NO'}`);
    
    // Save decrypted file
    console.log('\n13. Saving decrypted file...');
    const decryptedFilePath = path.join(__dirname, 'decrypted-test.txt');
    await fs.writeFile(decryptedFilePath, decryptedData);
    console.log(`   Decrypted file saved to: ${decryptedFilePath}`);
    
    // Demonstrate signature generation and verification
    console.log('\n14. Demonstrating digital signatures...');
    const message = 'This message needs to be authenticated';
    console.log(`   Message: ${message}`);
    
    // Sign message with private key
    console.log('   Signing message with RSA private key...');
    const signature = await cryptoModule.signWithRSA(message, privateKey);
    console.log(`   Signature (base64): ${signature.toString('base64').substring(0, 64)}...`);
    
    // Verify signature with public key
    console.log('   Verifying signature with RSA public key...');
    const isSignatureValid = await cryptoModule.verifyWithRSA(message, signature, publicKey);
    console.log(`   Signature valid: ${isSignatureValid ? 'YES' : 'NO'}`);
    
    // Summary
    console.log('\n=== Crypto Demo Summary ===');
    console.log('1. Generated AES-256 key and 96-bit IV');
    console.log('2. Generated RSA-2048 key pair for key encapsulation');
    console.log('3. Encrypted data using AES-GCM with authentication');
    console.log('4. Wrapped AES key with RSA public key');
    console.log('5. Stored encrypted file and metadata separately');
    console.log('6. Unwrapped AES key with RSA private key');
    console.log('7. Decrypted file with AES-GCM, verifying authentication');
    console.log('8. Verified decryption accuracy');
    console.log('9. Demonstrated RSA digital signature generation and verification');
    
    if (isDecryptionSuccessful && isSignatureValid) {
      console.log('\n✅ All cryptographic operations completed successfully!');
    } else {
      console.log('\n❌ Some cryptographic operations failed!');
    }
    
  } catch (error) {
    console.error('Error in crypto demo:', error);
  }
}

// Run the demo
if (require.main === module) {
  simpleCryptoDemo();
}

module.exports = { simpleCryptoDemo };
