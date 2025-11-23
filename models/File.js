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
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24 hours from upload
  },
  accessRights: [
    {
      organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
      },
      organizationName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      organizationDisplayName: {
        type: String,
        trim: true,
      },
      departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
      },
      departmentName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      departmentDisplayName: {
        type: String,
        trim: true,
      },
    },
  ],
  editAgreementRequired: {
    type: Boolean,
    default: false,
  },
  editAgreementOrganizations: [
    {
      organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
      },
      organizationName: {
        type: String,
        trim: true,
        lowercase: true,
      },
      organizationDisplayName: {
        type: String,
        trim: true,
      },
    },
  ],
  // Encryption metadata
  encryption: {
    algorithm: {
      type: String,
      enum: ['AES-256-GCM'],
      default: 'AES-256-GCM',
    },
    iv: {
      type: String, // Base64 encoded IV
    },
    authTag: {
      type: String, // Base64 encoded auth tag
    },
  },
  // Encrypted symmetric keys for each department
  encryptedSymmetricKeys: [
    {
      departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
      },
      departmentName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
      },
      organizationName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      encryptedKey: {
        type: String, // Base64 encoded encrypted symmetric key
        required: true,
      },
      publicKeyId: {
        type: String, // Reference to the public key used for encryption
      },
    },
  ],
  // Edit proposal tracking
  activeProposalId: {
    type: String, // Blockchain proposal ID
    default: null,
  },
  proposedFilePath: {
    type: String, // Path to the proposed new encrypted file version
    default: null,
  },
  oldFilePath: {
    type: String, // Path to the old encrypted file (backup during proposal)
    default: null,
  },
  proposedEncryption: {
    algorithm: {
      type: String,
      enum: ['AES-256-GCM'],
    },
    iv: {
      type: String, // Base64 encoded IV for proposed file
    },
    authTag: {
      type: String, // Base64 encoded auth tag for proposed file
    },
  },
});

const File = mongoose.model('File', fileSchema);

export default File;
