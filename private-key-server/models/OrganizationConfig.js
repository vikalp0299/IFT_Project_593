import mongoose from 'mongoose';

/**
 * OrganizationConfig Model
 * Stores configuration for each organization on the private-key-server
 * This includes the JWT_SECRET used to verify tokens from the main server
 */
const organizationConfigSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    organizationDisplayName: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: String,
      trim: true,
    },
    jwtSecret: {
      type: String,
      required: true,
      trim: true,
      // JWT secret from main server - used to verify tokens
    },
    mainServerUrl: {
      type: String,
      trim: true,
      // Optional: URL of the main server for this organization
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    configuredBy: {
      type: String,
      trim: true,
      // Admin username who configured this
    },
    configuredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

organizationConfigSchema.index({ organizationName: 1, isActive: 1 });

const OrganizationConfig = mongoose.models.OrganizationConfig || 
  mongoose.model('OrganizationConfig', organizationConfigSchema);

export default OrganizationConfig;

