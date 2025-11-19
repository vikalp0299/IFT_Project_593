import mongoose from 'mongoose';
import crypto from 'crypto';

const departmentSchema = new mongoose.Schema(
  {
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
    },
    departmentId: {
      type: String,
      unique: true,
      index: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    departmentName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    publicKey: {
      pem: {
        type: String,
        required: true,
      },
      keyType: {
        type: String,
        default: 'RSA-OAEP',
      },
      keySize: {
        type: Number,
        default: 2048,
      },
      fingerprint: {
        type: String,
        required: true,
        unique: true,
      },
    },
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
  },
  {
    timestamps: true,
  }
);

departmentSchema.index({ organization: 1, departmentName: 1 }, { unique: true });
departmentSchema.index({ 'publicKey.fingerprint': 1 }, { unique: true });

departmentSchema.pre('save', function save(next) {
  this.departmentName = this.departmentName.toLowerCase();
  this.organizationName = this.organizationName.toLowerCase();
  if (!this.publicKey.fingerprint && this.publicKey?.pem) {
    this.publicKey.fingerprint = crypto
      .createHash('sha256')
      .update(this.publicKey.pem)
      .digest('hex');
  }
  next();
});

departmentSchema.methods.toResponse = function toResponse() {
  return {
    id: this._id,
    organization: this.organization,
    organizationName: this.organizationName,
    departmentName: this.departmentName,
    displayName: this.displayName,
    publicKey: {
      pem: this.publicKey.pem,
      keyType: this.publicKey.keyType,
      keySize: this.publicKey.keySize,
      fingerprint: this.publicKey.fingerprint,
    },
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Department = mongoose.model('Department', departmentSchema);

export default Department;

