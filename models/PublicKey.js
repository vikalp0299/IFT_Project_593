import mongoose from 'mongoose';
import crypto from 'crypto';

const publicKeySchema = new mongoose.Schema({
  // Primary association - Organization
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Secondary association - User within organization
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Organization and User names for easier queries
  organizationName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // Public key data
  publicKeyPem: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Basic PEM format validation
        return v.includes('-----BEGIN PUBLIC KEY-----') && 
               v.includes('-----END PUBLIC KEY-----');
      },
      message: 'Invalid PEM format for public key'
    }
  },
  
  // Unique key identifier
  keyId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return crypto.randomUUID();
    }
  },
  
  // Key fingerprint for uniqueness validation
  keyFingerprint: {
    type: String,
    required: false, // Will be set by pre-save middleware
    unique: true,
    sparse: true // Allow multiple null values but enforce uniqueness for non-null values
  },
  
  // Key metadata
  keyType: {
    type: String,
    enum: ['RSA-OAEP', 'RSA-PSS', 'ECDSA'],
    default: 'RSA-OAEP'
  },
  
  keySize: {
    type: Number,
    default: 2048
  },
  
  // Status and lifecycle
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isPrimary: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Additional metadata
  metadata: {
    clientInfo: {
      type: String,
      trim: true
    },
    keyVersion: {
      type: String,
      default: '1.0'
    }
  }
});

// Compound indexes for efficient queries
publicKeySchema.index({ organization: 1, user: 1, isActive: 1 }, { unique: true });
publicKeySchema.index({ organizationName: 1, username: 1, isActive: 1 });
publicKeySchema.index({ keyFingerprint: 1 }, { unique: true });

// Pre-save middleware to generate fingerprint
publicKeySchema.pre('save', function(next) {
  // Always generate fingerprint if publicKeyPem is present
  if (this.publicKeyPem) {
    // Generate SHA-256 fingerprint of the public key
    this.keyFingerprint = crypto
      .createHash('sha256')
      .update(this.publicKeyPem)
      .digest('hex');
  } else {
    // If no publicKeyPem, this is an invalid document
    return next(new Error('publicKeyPem is required'));
  }
  
  this.updatedAt = Date.now();
  next();
});

// Post-save validation to ensure fingerprint was generated
publicKeySchema.post('save', function(doc) {
  if (!doc.keyFingerprint) {
    console.error('Warning: keyFingerprint was not generated for document:', doc._id);
  }
});

// Static methods for key operations
publicKeySchema.statics.findByOrganization = function(organizationId) {
  return this.find({ 
    organization: organizationId, 
    isActive: true 
  }).populate('user', 'username email firstName lastName role');
};

publicKeySchema.statics.findByUserAndOrganization = function(userId, organizationId) {
  return this.findOne({ 
    user: userId, 
    organization: organizationId, 
    isActive: true 
  });
};

publicKeySchema.statics.findByKeyId = function(keyId) {
  return this.findOne({ 
    keyId: keyId, 
    isActive: true 
  }).populate('user organization');
};

publicKeySchema.statics.deactivateKey = function(keyId) {
  return this.findOneAndUpdate(
    { keyId: keyId },
    { isActive: false, updatedAt: Date.now() },
    { new: true }
  );
};

// Instance methods
publicKeySchema.methods.toSafeObject = function() {
  return {
    keyId: this.keyId,
    organizationName: this.organizationName,
    username: this.username,
    keyType: this.keyType,
    keySize: this.keySize,
    isActive: this.isActive,
    isPrimary: this.isPrimary,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

publicKeySchema.methods.getPublicKeyForEncryption = function() {
  return {
    keyId: this.keyId,
    publicKeyPem: this.publicKeyPem,
    keyType: this.keyType,
    keySize: this.keySize
  };
};

// Virtual for formatted creation date
publicKeySchema.virtual('createdAtFormatted').get(function() {
  return this.createdAt.toISOString();
});

// Ensure virtual fields are serialized
publicKeySchema.set('toJSON', { virtuals: true });
publicKeySchema.set('toObject', { virtuals: true });

const PublicKey = mongoose.model('PublicKey', publicKeySchema);

export default PublicKey;
