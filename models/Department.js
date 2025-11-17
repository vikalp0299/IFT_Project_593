import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
    unique: true,
    required: true
  },
  departmentName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    unique: true
  },
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
departmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Auto-generate departmentId if not provided
  if (!this.departmentId) {
    this.departmentId = new mongoose.Types.ObjectId();
  }
  next();
});

// Index for faster queries
departmentSchema.index({ departmentId: 1 }, { unique: true });
departmentSchema.index({ departmentName: 1 }, { unique: true });

const Department = mongoose.model('Department', departmentSchema);

export default Department;

