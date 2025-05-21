# SecureDrive Client-Side Encryption API

This module provides client-side encryption capabilities for the SecureDrive application, ensuring that all files are encrypted before they leave the user's device, and decrypted only on authorized users' devices.

## Architecture

The client-side encryption system consists of several modules:

1. **Core Cryptography Module** (`crypto.js`): Low-level cryptographic operations using Node.js crypto module
2. **Web Crypto Module** (`web-crypto.js`): Browser-compatible version using Web Crypto API
3. **File Encryption API** (`file-encryption.js`): Higher-level API for file encryption operations
4. **KMS Integration Service** (`kms-integration.js`): Client for interacting with the Key Management Service
5. **SecureDrive Client API** (`secure-drive-client.js`): Main client API that combines all components

## Security Features

- **AES-256-GCM** for file encryption with authenticated encryption
- **RSA-OAEP** (2048-bit minimum) for key wrapping
- **Unique IV** for each encryption operation
- **Authentication tag** verification for integrity checking
- **Client-side key generation** ensures keys never leave the device unencrypted

## Usage in Node.js

```javascript
const SecureDriveClientAPI = require('./crypto/secure-drive-client');

// Create client instance
const client = new SecureDriveClientAPI({
  apiUrl: 'http://localhost:3001',
  kmsUrl: 'http://localhost:3002'
});

// Set JWT authentication token
client.setToken('<your-jwt-token>');

// Initialize with user ID
await client.initialize('<user-id>');

// Upload an encrypted file
const uploadResult = await client.uploadFile('/path/to/file.txt');

// Download and decrypt a file
const downloadResult = await client.downloadFile(
  uploadResult.data._id,
  '/path/to/save/decrypted-file.txt'
);

// Share a file with another user
await client.shareFile(
  uploadResult.data._id,
  'target-user-id',
  'read'  // or 'write'
);
```

## Usage in Browser

Include the web crypto module:

```html
<script src="/crypto/web-crypto.js"></script>
```

Use the React component:

```jsx
import React from 'react';
import SecureDrive from './SecureDriveComponent';

function App() {
  return (
    <SecureDrive 
      apiUrl="http://localhost:3001"
      kmsUrl="http://localhost:3002"
      token="<your-jwt-token>"
      userId="<user-id>"
    />
  );
}
```

Or use the hook directly:

```jsx
import React from 'react';
import { useSecureDrive } from './SecureDriveComponent';

function MySecureDriveApp() {
  const { 
    files, 
    uploadFile, 
    downloadFile, 
    isLoading, 
    error 
  } = useSecureDrive({
    apiUrl: "http://localhost:3001",
    kmsUrl: "http://localhost:3002",
    token: "<your-jwt-token>",
    userId: "<user-id>"
  });

  // Your custom UI implementation
  return (
    <div>
      {/* File upload UI */}
      <input type="file" onChange={(e) => uploadFile(e.target.files[0])} />
      
      {/* File list UI */}
      <ul>
        {files.map(file => (
          <li key={file._id}>
            {file.originalName}
            <button onClick={() => downloadFile(file._id)}>
              Download
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Encryption Flow

1. **File Upload**:
   - Generate random AES-256 key
   - Generate unique IV
   - Encrypt file with AES-GCM
   - Wrap (encrypt) AES key with user's RSA public key
   - Upload encrypted file and metadata

2. **File Download**:
   - Download encrypted file and metadata
   - Unwrap (decrypt) AES key with user's RSA private key
   - Decrypt file with AES-GCM
   - Verify authentication tag

3. **File Sharing**:
   - Owner decrypts the AES key with their RSA private key
   - Owner re-encrypts the AES key with recipient's RSA public key
   - Update permissions in KMS and storage API

## Security Recommendations

1. Store RSA private keys securely
2. Use strong passwords for key derivation
3. Keep the JWT token secure
4. Implement proper session management
5. Regularly rotate RSA keys

## Testing

Run the demonstration:

```bash
node examples/secure-drive-demo.js
```

Run tests:

```bash
npm test
```

## Integration Points

- **React Frontend**: Use the `SecureDriveComponent.jsx` component
- **Node.js Backend**: Use the `secure-drive-client.js` module
- **Storage API**: Server component handles encrypted files
- **KMS Service**: Manages key sharing and access control
