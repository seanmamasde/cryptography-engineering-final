# Secure Drive Demo Instructions

This folder contains demonstrations of the secure client-side encryption and storage API integration. These demos show how to use the cryptography module and storage API without any frontend dependencies.

## Available Demos

1. **Simple Crypto Demo** (`simple-crypto-demo.js`)
   - Demonstrates pure cryptographic operations
   - Shows AES-GCM encryption/decryption
   - Shows RSA key wrapping/unwrapping
   - Includes digital signatures
   - No backend services required

2. **Storage API Demo** (`storage-api-demo.js`)
   - Demonstrates integration with the Storage API
   - Includes client-side encryption before upload
   - Shows file listing and downloading
   - Includes decryption of downloaded files
   - Requires both Storage API and KMS services to be running

## Prerequisites

Before running the demos, make sure:

1. You have installed all required dependencies:
   ```
   npm install
   ```

2. For the Storage API demo, both services need to be running:
   - Storage API at http://localhost:3001
   - KMS Service at http://localhost:3002

## Running the Demos

To run the Simple Crypto Demo (no backend required):

```
node examples/simple-crypto-demo.js
```

To run the Storage API Demo (requires backend services):

```
node examples/storage-api-demo.js
```

## What You'll See

The demos will:
1. Generate cryptographic keys
2. Encrypt files with AES-GCM
3. Wrap keys with RSA
4. Store encrypted data and metadata
5. Decrypt files
6. Verify data integrity

All output will be displayed in the terminal with detailed explanations at each step.

## Troubleshooting

If you encounter errors:

1. Make sure you've installed all dependencies: `npm install`
2. For the Storage API demo, ensure both services are running at the configured URLs
3. Check that the JWT token and user ID are valid in the configuration
