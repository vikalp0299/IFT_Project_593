import mongoose from 'mongoose';

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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublicKey',
      required: true,
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

departmentSchema.pre('save', function save(next) {
  this.departmentName = this.departmentName.toLowerCase();
  this.organizationName = this.organizationName.toLowerCase();
  next();
});

departmentSchema.methods.toResponse = function toResponse() {
  const populatedKey = this.populated('publicKey') ? this.publicKey : null;
  return {
    id: this._id,
    organization: this.organization,
    organizationName: this.organizationName,
    departmentName: this.departmentName,
    displayName: this.displayName,
    publicKey: populatedKey
      ? {
          keyId: populatedKey.keyId,
          keyType: populatedKey.keyType,
          keySize: populatedKey.keySize,
          createdAt: populatedKey.createdAt,
        }
      : this.publicKey,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Department = mongoose.model('Department', departmentSchema);

let departmentIndexesEnsured = false;

const ensureDepartmentIndexes = async () => {
  if (departmentIndexesEnsured) {
    return;
  }
  try {
    const indexes = await Department.collection.indexes();
    const legacyIndex = indexes.find((idx) => idx.name === 'departmentName_1');
    if (legacyIndex) {
      await Department.collection.dropIndex('departmentName_1');
    }
    await Department.collection.createIndex(
      { organization: 1, departmentName: 1 },
      { unique: true, name: 'organization_department_unique_idx' }
    );
    departmentIndexesEnsured = true;
  } catch (error) {
    console.error('Failed to ensure department indexes:', error.message);
  }
};

if (mongoose.connection.readyState === 1) {
  ensureDepartmentIndexes().catch(() => undefined);
} else {
  mongoose.connection.once('connected', () => {
    ensureDepartmentIndexes().catch(() => undefined);
  });
}

export default Department;

