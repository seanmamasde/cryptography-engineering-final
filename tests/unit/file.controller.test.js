const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../index');
const File = require('../models/file.model');

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

describe('File Controller Tests', () => {
  let token, otherUserToken;
  const testUserId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  
  beforeAll(() => {
    // Create test JWT tokens
    token = jwt.sign({ id: testUserId }, process.env.JWT_SECRET);
    otherUserToken = jwt.sign({ id: otherUserId }, process.env.JWT_SECRET);
  });

  beforeEach(async () => {
    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
  });

  describe('File Upload Tests', () => {
    it('should successfully upload a file', async () => {
      const testFilePath = path.join(__dirname, '../__mocks__/test.txt');
      
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath)
        .field('encryptionMetadata', JSON.stringify({
          iv: 'test-iv',
          tag: 'test-tag',
          encryptedKey: 'test-key'
        }));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filename');
    });

    it('should return error when no file is provided', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('File List Tests', () => {
    it('should return user\'s file list', async () => {
      // Create test file record
      await File.create({
        filename: 'test-file',
        originalName: 'test.txt',
        path: 'uploads/test.txt',
        size: 100,
        mimeType: 'text/plain',
        userId: testUserId,
        permissions: {
          owner: testUserId,
          readers: [testUserId],
          writers: [testUserId]
        }
      });

      const response = await request(app)
        .get('/api/files/list')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe('File Download Tests', () => {
    it('should successfully download a file', async () => {
      // Create test file
      const testFile = await File.create({
        filename: 'test-download-file',
        originalName: 'test.txt',
        path: 'uploads/test.txt',
        size: 100,
        mimeType: 'text/plain',
        userId: testUserId,
        permissions: {
          owner: testUserId,
          readers: [testUserId],
          writers: [testUserId]
        }
      });

      // Create actual file
      const testFilePath = path.join(__dirname, '../../uploads/test.txt');
      await fs.writeFile(testFilePath, 'test content');

      const response = await request(app)
        .get(`/api/files/download/${testFile._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Clean up test file
      await fs.unlink(testFilePath).catch(() => {});
    });

    it('should return 404 for non-existent file', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/files/download/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Permission Control Tests', () => {
    let testFile;
    
    beforeEach(async () => {
      // Create test file
      testFile = await File.create({
        filename: 'permission-test-file',
        originalName: 'test.txt',
        path: 'uploads/test.txt',
        size: 100,
        mimeType: 'text/plain',
        userId: testUserId,
        permissions: {
          owner: testUserId,
          readers: [],
          writers: []
        }
      });

      // Create actual file
      const testFilePath = path.join(__dirname, '../../uploads/test.txt');
      await fs.writeFile(testFilePath, 'test content');
    });

    describe('File Access Permissions', () => {
      it('unauthorized user cannot download file', async () => {
        const response = await request(app)
          .get(`/api/files/download/${testFile._id}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('No permission to access this file');
      });

      it('unauthorized user cannot delete file', async () => {
        const response = await request(app)
          .delete(`/api/files/${testFile._id}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Only file owner can delete the file');
      });

      it('reader can download but cannot delete file', async () => {
        // Add read permission
        testFile.permissions.readers.push(otherUserId);
        await testFile.save();

        // Test download
        const downloadResponse = await request(app)
          .get(`/api/files/download/${testFile._id}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect(downloadResponse.status).toBe(200);

        // Test delete
        const deleteResponse = await request(app)
          .delete(`/api/files/${testFile._id}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect(deleteResponse.status).toBe(403);
      });

      it('writer can download but cannot delete file', async () => {
        // Add write permission
        testFile.permissions.writers.push(otherUserId);
        await testFile.save();

        // Test download
        const downloadResponse = await request(app)
          .get(`/api/files/download/${testFile._id}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect(downloadResponse.status).toBe(200);

        // Test delete
        const deleteResponse = await request(app)
          .delete(`/api/files/${testFile._id}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect(deleteResponse.status).toBe(403);
      });
    });

    describe('Permission Update Tests', () => {
      it('file owner can update permissions', async () => {
        const response = await request(app)
          .put(`/api/files/${testFile._id}/permissions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            readers: [otherUserId.toString()],
            writers: [otherUserId.toString()]
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.permissions.readers).toContain(otherUserId.toString());
        expect(response.body.data.permissions.writers).toContain(otherUserId.toString());
      });

      it('non-owner cannot update permissions', async () => {
        const response = await request(app)
          .put(`/api/files/${testFile._id}/permissions`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({
            readers: [otherUserId.toString()],
            writers: [otherUserId.toString()]
          });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Only file owner can update permissions');
      });

      it('can remove user permissions', async () => {
        // First add permissions
        testFile.permissions.readers = [otherUserId];
        testFile.permissions.writers = [otherUserId];
        await testFile.save();

        // Remove permissions
        const response = await request(app)
          .put(`/api/files/${testFile._id}/permissions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            readers: [],
            writers: []
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.permissions.readers).toHaveLength(0);
        expect(response.body.data.permissions.writers).toHaveLength(0);

        // Verify access is revoked
        const downloadResponse = await request(app)
          .get(`/api/files/download/${testFile._id}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect(downloadResponse.status).toBe(403);
      });
    });

    afterEach(async () => {
      // Clean up test files
      const testFilePath = path.join(__dirname, '../../uploads/test.txt');
      await fs.unlink(testFilePath).catch(() => {});
      await File.deleteOne({ _id: testFile._id }).catch(() => {});
    });
  });

  describe('Database Error Tests', () => {
    describe('File Upload Errors', () => {
      it('should return 500 when database create fails', async () => {
        // Mock database create failure
        jest.spyOn(File, 'create').mockRejectedValueOnce(new Error('Database error'));

        const testFilePath = path.join(__dirname, '../__mocks__/test.txt');
        const response = await request(app)
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${token}`)
          .attach('file', testFilePath)
          .field('encryptionMetadata', JSON.stringify({
            iv: 'test-iv',
            tag: 'test-tag',
            encryptedKey: 'test-key'
          }));

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('File upload failed');
      });
    });

    describe('File List Errors', () => {
      it('should return 500 when database query fails', async () => {
        // Mock database query failure
        jest.spyOn(File, 'find').mockRejectedValueOnce(new Error('Database query error'));

        const response = await request(app)
          .get('/api/files/list')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to get file list');
      });
    });

    describe('File Download Errors', () => {
      it('should return 500 when database query fails', async () => {
        // Mock database query failure
        jest.spyOn(File, 'findById').mockRejectedValueOnce(new Error('Database query error'));

        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/files/download/${fakeId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('File download failed');
      });
    });

    describe('File Delete Errors', () => {
      it('should return 500 when database delete fails', async () => {
        // Create test file
        const testFile = await File.create({
          filename: 'test-delete-error-file',
          originalName: 'test.txt',
          path: 'uploads/test.txt',
          size: 100,
          mimeType: 'text/plain',
          userId: testUserId,
          permissions: {
            owner: testUserId,
            readers: [],
            writers: []
          }
        });

        // Mock database delete failure
        jest.spyOn(File, 'deleteOne').mockRejectedValueOnce(new Error('Database delete error'));

        const response = await request(app)
          .delete(`/api/files/${testFile._id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('File deletion failed');
      });
    });

    describe('Permission Update Errors', () => {
      let testFile;

      beforeEach(async () => {
        testFile = await File.create({
          filename: 'test-permission-error-file',
          originalName: 'test.txt',
          path: 'uploads/test.txt',
          size: 100,
          mimeType: 'text/plain',
          userId: testUserId,
          permissions: {
            owner: testUserId,
            readers: [],
            writers: []
          }
        });
      });

      it('should return 500 when database update fails', async () => {
        // Mock save operation failure
        jest.spyOn(mongoose.Model.prototype, 'save')
          .mockRejectedValueOnce(new Error('Database save error'));

        const response = await request(app)
          .put(`/api/files/${testFile._id}/permissions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            readers: [otherUserId.toString()],
            writers: [otherUserId.toString()]
          });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to update file permissions');
      });

      it('should return 500 for invalid ObjectId', async () => {
        const response = await request(app)
          .put('/api/files/invalid-id/permissions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            readers: [otherUserId.toString()],
            writers: [otherUserId.toString()]
          });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });

      afterEach(async () => {
        // Clean up test files
        await File.deleteOne({ _id: testFile._id }).catch(() => {});
        // Clean up all mocks
        jest.restoreAllMocks();
      });
    });

    afterEach(() => {
      // Clean up all mocks
      jest.restoreAllMocks();
    });
  });

  // Clean up test files
  afterAll(async () => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      const files = await fs.readdir(uploadDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(uploadDir, file)).catch(() => {}))
      );
    } catch (error) {
      console.error('Failed to clean up files:', error);
    }
  });
}); 