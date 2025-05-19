const File = require('../models/file.model');
const fs = require('fs').promises;
const path = require('path');

const fileController = {
  // Upload file
  uploadFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
        userId: req.user.id,
        encryptionMetadata: req.body.encryptionMetadata, // Contains encryption information
        permissions: {
          owner: req.user.id,
          readers: [req.user.id],
          writers: [req.user.id]
        }
      };

      const file = await File.create(fileData);

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: file
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: error.message
      });
    }
  },

  // Get file list
  getFileList: async (req, res) => {
    try {
      const files = await File.find({
        $or: [
          { 'permissions.owner': req.user.id },
          { 'permissions.readers': req.user.id },
          { 'permissions.writers': req.user.id }
        ]
      });

      res.json({
        success: true,
        data: files
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get file list',
        error: error.message
      });
    }
  },

  // Download file
  downloadFile: async (req, res) => {
    try {
      const file = await File.findById(req.params.fileId);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check permissions
      const userHasAccess = 
        file.permissions.owner.toString() === req.user.id ||
        file.permissions.readers.map(id => id.toString()).includes(req.user.id) ||
        file.permissions.writers.map(id => id.toString()).includes(req.user.id);

      if (!userHasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No permission to access this file'
        });
      }

      const filePath = path.join(__dirname, '../../', file.path);
      res.download(filePath, file.originalName);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'File download failed',
        error: error.message
      });
    }
  },

  // Delete file
  deleteFile: async (req, res) => {
    try {
      const file = await File.findById(req.params.fileId);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check if user is file owner
      if (file.permissions.owner.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only file owner can delete the file'
        });
      }

      // Delete physical file
      await fs.unlink(path.join(__dirname, '../../', file.path));
      
      // Delete database record
      await File.deleteOne({ _id: file._id });

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'File deletion failed',
        error: error.message
      });
    }
  },

  // Update file permissions
  updateFilePermissions: async (req, res) => {
    try {
      const file = await File.findById(req.params.fileId);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check if user is file owner
      if (file.permissions.owner.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only file owner can update permissions'
        });
      }

      // Update permissions
      if (req.body.readers) file.permissions.readers = req.body.readers;
      if (req.body.writers) file.permissions.writers = req.body.writers;

      await file.save();

      res.json({
        success: true,
        message: 'File permissions updated',
        data: file
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update file permissions',
        error: error.message
      });
    }
  }
};

module.exports = { fileController }; 