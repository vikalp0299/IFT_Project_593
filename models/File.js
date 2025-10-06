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
  access: {
    type: [mongoose.Schema.Types.ObjectId],   // Array of user IDs who can access the file
    ref: 'User',
    default: [],
  },
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
