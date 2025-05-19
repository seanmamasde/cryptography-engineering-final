const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const crypto = require('crypto');

const API_URL = 'http://localhost:3001';
let token = null;
let fileId = null;

// Utility functions
const generateAESKey = () => crypto.randomBytes(32);
const generateIV = () => crypto.randomBytes(12);
const bufferToBase64 = buffer => buffer.toString('base64');
const base64ToBuffer = base64 => Buffer.from(base64, 'base64');

// Example usage of the API
async function testAPI() {
  try {
    console.log('Starting API test...');

    // 1. Upload a file
    console.log('\n1. Testing file upload...');
    const testFilePath = path.join(__dirname, 'test.txt');
    await fs.writeFile(testFilePath, 'This is a test file content');

    // Generate encryption data
    const aesKey = generateAESKey();
    const iv = generateIV();
    const tag = crypto.randomBytes(16);

    // Create form data
    const formData = new FormData();
    const fileContent = await fs.readFile(testFilePath);
    formData.append('file', fileContent, {
      filename: 'test.txt',
      contentType: 'text/plain'
    });
    formData.append('encryptionMetadata', JSON.stringify({
      iv: bufferToBase64(iv),
      tag: bufferToBase64(tag),
      encryptedKey: bufferToBase64(aesKey)
    }));

    const uploadResponse = await fetch(`${API_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload response:', uploadResult);
    fileId = uploadResult.data._id;

    // 2. List files
    console.log('\n2. Testing file list...');
    const listResponse = await fetch(`${API_URL}/api/files/list`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!listResponse.ok) {
      throw new Error(`List failed with status ${listResponse.status}`);
    }

    const listResult = await listResponse.json();
    console.log('File list:', listResult);

    // 3. Download file
    console.log('\n3. Testing file download...');
    const downloadResponse = await fetch(`${API_URL}/api/files/download/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!downloadResponse.ok) {
      throw new Error(`Download failed with status ${downloadResponse.status}`);
    }

    const downloadedContent = await downloadResponse.buffer();
    await fs.writeFile('downloaded-file.txt', downloadedContent);
    console.log('File downloaded successfully');

    // 4. Update permissions
    console.log('\n4. Testing permission update...');
    const updateResponse = await fetch(`${API_URL}/api/files/${fileId}/permissions`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        readers: ['user-id-1'],
        writers: ['user-id-2']
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Permission update failed with status ${updateResponse.status}`);
    }

    const updateResult = await updateResponse.json();
    console.log('Permission update result:', updateResult);

    // 5. Delete file
    console.log('\n5. Testing file deletion...');
    const deleteResponse = await fetch(`${API_URL}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!deleteResponse.ok) {
      throw new Error(`Delete failed with status ${deleteResponse.status}`);
    }

    const deleteResult = await deleteResponse.json();
    console.log('Delete result:', deleteResult);

    // Clean up
    await fs.unlink(testFilePath).catch(() => {});
    await fs.unlink('downloaded-file.txt').catch(() => {});

    console.log('\nAPI test completed successfully!');
  } catch (error) {
    console.error('Error during API test:', error);
    if (error.response) {
      const errorBody = await error.response.text();
      console.error('Error response:', errorBody);
    }
  }
}

// Run the test
if (require.main === module) {
  // Set the JWT token generated from generate-token.js
  token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImlhdCI6MTc0NzY0MzI1Nn0.TUWTDJ-aCN8VmaCRT0dvS9731rQcdiRUiglhBq5oFgs';
  testAPI();
} 