const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  encryptionMetadata: {
    iv: String,
    tag: String,
    encryptedKey: String,
    algorithm: {
      type: String,
      default: 'AES-GCM'
    }
  },
  permissions: {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    writers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}, {
  timestamps: true
});

fileSchema.index({ userId: 1 });
fileSchema.index({ 'permissions.owner': 1 });
fileSchema.index({ 'permissions.readers': 1 });
fileSchema.index({ 'permissions.writers': 1 });

const File = mongoose.model('File', fileSchema);

module.exports = File; 