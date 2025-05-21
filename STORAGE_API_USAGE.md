# Secure Drive API Usage Guide

## Setup and Installation


1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/secure-drive
JWT_SECRET=your-secret-key
NODE_ENV=development
```

3. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
All API endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### 1. Upload File
**Endpoint:** `POST /api/files/upload`

**Request:**
```bash
curl -X POST \
  http://localhost:3001/api/files/upload \
  -H 'Authorization: Bearer <your-jwt-token>' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@/path/to/your/file.txt' \
  -F 'encryptionMetadata={
    "iv": "your-initialization-vector",
    "tag": "your-authentication-tag",
    "encryptedKey": "your-encrypted-key"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "filename": "generated-filename",
    "originalName": "file.txt",
    "size": 1234,
    "mimeType": "text/plain",
    "encryptionMetadata": {
      "iv": "your-initialization-vector",
      "tag": "your-authentication-tag",
      "encryptedKey": "your-encrypted-key"
    }
  }
}
```

### 2. List Files
**Endpoint:** `GET /api/files/list`

**Request:**
```bash
curl -X GET \
  http://localhost:3001/api/files/list \
  -H 'Authorization: Bearer <your-jwt-token>'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "filename": "file1",
      "originalName": "document1.txt",
      "size": 1234,
      "mimeType": "text/plain",
      "permissions": {
        "owner": "user-id",
        "readers": ["user-id-1", "user-id-2"],
        "writers": ["user-id-1"]
      }
    }
  ]
}
```

### 3. Download File
**Endpoint:** `GET /api/files/download/:fileId`

**Request:**
```bash
curl -X GET \
  http://localhost:3001/api/files/download/file-id \
  -H 'Authorization: Bearer <your-jwt-token>' \
  --output downloaded-file.txt
```

### 4. Delete File
**Endpoint:** `DELETE /api/files/:fileId`

**Request:**
```bash
curl -X DELETE \
  http://localhost:3001/api/files/file-id \
  -H 'Authorization: Bearer <your-jwt-token>'
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### 5. Update File Permissions
**Endpoint:** `PUT /api/files/:fileId/permissions`

**Request:**
```bash
curl -X PUT \
  http://localhost:3001/api/files/file-id/permissions \
  -H 'Authorization: Bearer <your-jwt-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "readers": ["user-id-1", "user-id-2"],
    "writers": ["user-id-1"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "File permissions updated",
  "data": {
    "permissions": {
      "owner": "user-id",
      "readers": ["user-id-1", "user-id-2"],
      "writers": ["user-id-1"]
    }
  }
}
```

## Client-side Encryption Process

1. Before uploading a file:
   - Generate a random AES key
   - Generate a random IV
   - Encrypt the file using AES-GCM
   - Encrypt the AES key using the recipient's public key
   - Include the IV, authentication tag, and encrypted key in the upload request

2. When downloading a file:
   - Download the encrypted file
   - Retrieve the encryption metadata
   - Decrypt the AES key using your private key
   - Use the IV and AES key to decrypt the file
   - Verify the authentication tag

## Error Handling

The API returns standard HTTP status codes:
- 200: Success
- 201: Created (for uploads)
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

All API responses follow this format:
```json
{
  "success": boolean,
  "message": "Description",
  "data": object | null,
  "error": "Error details (dev only)"
}
```