import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  // ...existing code...
  hasBlockchain: {
    type: Boolean,
    default: false,
    required: true
  },
  blockchainOrgName: {
    type: String,
    default: null,
    unique: true,
    sparse: true // Allows multiple null values but ensures unique non-null values
  }
  // ...existing code...
}, { timestamps: true });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;