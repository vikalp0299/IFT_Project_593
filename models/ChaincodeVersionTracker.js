import mongoose from 'mongoose';

const chaincodeVersionTrackerSchema = new mongoose.Schema({
  organizationName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  version: {
    type: String,
    required: true,
    trim: true,
    default: '1.0'
  },
  sequence: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Create compound index for unique organization tracking
chaincodeVersionTrackerSchema.index({ organizationName: 1 }, { unique: true });

const ChaincodeVersionTracker = mongoose.model('ChaincodeVersionTracker', chaincodeVersionTrackerSchema);

export default ChaincodeVersionTracker;
