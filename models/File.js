import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  originalname: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  userId: {                         // Explicit userId field (string or ObjectId)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploader: {                       // Optionally, keep both userId and uploader for compatibility
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  access: [{
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    }
  }],
  uploadedAt: {                      // upload time
    type: Date,
    default: Date.now,
  },
  toHoldTime: {                      // Last updated time
    type: Date,
    default: Date.now + 24 * 60 * 60 * 1000, // Default to 24 hours from upload
  },
});

const File = mongoose.model('File', fileSchema);

export default File;
