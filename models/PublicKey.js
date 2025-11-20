import mongoose from 'mongoose';
import crypto from 'crypto';

const publicKeySchema = new mongoose.Schema({
  // Organization association
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },

  organizationName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },

  // Department association
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    index: true,
  },

  departmentName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },

  // Actor metadata
  createdBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    },
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
publicKeySchema.index({ keyFingerprint: 1 }, { unique: true });
publicKeySchema.index(
  { organization: 1, department: 1, isActive: 1 },
  {
    unique: true,
    name: 'organization_department_active_unique',
    partialFilterExpression: { isActive: true },
  }
);
publicKeySchema.index({ departmentName: 1, organizationName: 1 });

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
publicKeySchema.statics.findByOrganization = function (organizationId) {
  return this.find({
    organization: organizationId,
    isActive: true,
  }).populate('department', 'departmentName displayName');
};

publicKeySchema.statics.findByDepartment = function (departmentId) {
  return this.findOne({
    department: departmentId,
    isActive: true,
  }).populate('department organization');
};

publicKeySchema.statics.findByKeyId = function (keyId) {
  return this.findOne({
    keyId,
    isActive: true,
  }).populate('department organization');
};

publicKeySchema.statics.deactivateKey = function(keyId) {
  return this.findOneAndUpdate(
    { keyId: keyId },
    { isActive: false, updatedAt: Date.now() },
    { new: true }
  );
};

// Instance methods
publicKeySchema.methods.toSafeObject = function () {
  return {
    keyId: this.keyId,
    organizationName: this.organizationName,
    departmentName: this.departmentName,
    keyType: this.keyType,
    keySize: this.keySize,
    isActive: this.isActive,
    isPrimary: this.isPrimary,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    createdBy: this.createdBy,
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

let publicKeyIndexesEnsured = false;

const ensurePublicKeyIndexes = async () => {
  if (publicKeyIndexesEnsured) {
    return;
  }
  try {
    const indexes = await PublicKey.collection.indexes();

    const legacyUserIndex = indexes.find((idx) => idx.name === 'organization_1_user_1_isActive_1');
    if (legacyUserIndex) {
      await PublicKey.collection.dropIndex('organization_1_user_1_isActive_1');
    }

    const legacyUsernameIndex = indexes.find(
      (idx) => idx.name === 'organizationName_1_username_1_isActive_1'
    );
    if (legacyUsernameIndex) {
      await PublicKey.collection.dropIndex('organizationName_1_username_1_isActive_1');
    }

    const legacyDeptIndex = indexes.find(
      (idx) => idx.name === 'organization_department_active_unique'
    );
    if (!legacyDeptIndex) {
      await PublicKey.collection.createIndex(
        { organization: 1, department: 1, isActive: 1 },
        {
          unique: true,
          name: 'organization_department_active_unique',
          background: true,
          partialFilterExpression: { isActive: true },
        }
      );
    }

    const legacyDeptNameIndex = indexes.find(
      (idx) => idx.name === 'departmentName_1_organizationName_1'
    );
    if (!legacyDeptNameIndex) {
      await PublicKey.collection.createIndex(
        { departmentName: 1, organizationName: 1 },
        {
          name: 'departmentName_1_organizationName_1',
          background: true,
        }
      );
    }

    publicKeyIndexesEnsured = true;
  } catch (error) {
    console.error('Failed to ensure public key indexes:', error.message);
  }
};

if (mongoose.connection.readyState === 1) {
  ensurePublicKeyIndexes().catch(() => undefined);
} else {
  mongoose.connection.once('connected', () => {
    ensurePublicKeyIndexes().catch(() => undefined);
  });
}

export default PublicKey;
