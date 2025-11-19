import mongoose from 'mongoose';

const localServerSchema = new mongoose.Schema(
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
    },
    baseUrl: {
      type: String,
      required: true,
      trim: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedByName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

localServerSchema.index({ organization: 1, baseUrl: 1 }, { unique: true });

localServerSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    baseUrl: this.baseUrl,
    isActive: this.isActive,
    addedAt: this.createdAt,
    addedByName: this.addedByName,
  };
};

const LocalServer = mongoose.model('LocalServer', localServerSchema);

export default LocalServer;

