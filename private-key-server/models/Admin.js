import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    organizationName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: 'default',
    },
    organizationDisplayName: {
      type: String,
      trim: true,
      default: 'Default Organization',
    },
    organizationId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    organizationName: this.organizationName,
    organizationDisplayName: this.organizationDisplayName,
    organizationId: this.organizationId,
  };
};

adminSchema.index({ organizationName: 1, username: 1 }, { unique: true });
adminSchema.index({ organizationName: 1, email: 1 }, { unique: true });

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;

