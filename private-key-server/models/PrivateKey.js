import mongoose from 'mongoose';

const privateKeySchema = new mongoose.Schema({
  encryptedPrivateKey: {
    type: String,
    required: true,
  },
  encryption: {
    algorithm: {
      type: String,
      default: 'AES-256-GCM',
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    fingerprint: {
      type: String,
      required: true,
    },
  },
  departmentName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  storedBy: {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
privateKeySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries - ensure one private key per department
privateKeySchema.index({ departmentName: 1 }, { unique: true });
privateKeySchema.index({ 'storedBy.username': 1 });
privateKeySchema.index({ 'storedBy.email': 1 });

const PrivateKey = mongoose.model('PrivateKey', privateKeySchema);

export default PrivateKey;


