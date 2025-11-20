import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  // Department name
  departmentName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  organizationName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
    default: 'default',
  },
  organizationId: {
    type: String,
    default: null,
  },
  
  // List of allowed users (can be userId, username, or email)
  allowedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: {
      type: String,
      trim: true,
      lowercase: true
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
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
permissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
permissionSchema.index({ organizationName: 1, departmentName: 1 }, { unique: true });
permissionSchema.index({ 'allowedUsers.userId': 1 });
permissionSchema.index({ 'allowedUsers.username': 1 });
permissionSchema.index({ 'allowedUsers.userEmail': 1 });

const Permission = mongoose.model('Permission', permissionSchema);

export default Permission;


