const express = require('express');
const router = express.Router();
const multer = require('multer');
const { fileController } = require('../controllers/file.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

// File upload route
router.post('/upload', 
  authMiddleware.verifyToken,
  upload.single('file'),
  fileController.uploadFile
);

// Get file list
router.get('/list',
  authMiddleware.verifyToken,
  fileController.getFileList
);

// Download file
router.get('/download/:fileId',
  authMiddleware.verifyToken,
  fileController.downloadFile
);

// Delete file
router.delete('/:fileId',
  authMiddleware.verifyToken,
  fileController.deleteFile
);

// Update file permissions
router.put('/:fileId/permissions',
  authMiddleware.verifyToken,
  fileController.updateFilePermissions
);

module.exports = router;