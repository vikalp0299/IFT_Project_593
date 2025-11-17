import mongoose from 'mongoose';

const privateKeySchema = new mongoose.Schema({
  // Encrypted private key
  privateKey: {
    type: String,
    required: true,
    trim: true
  },
  
  // Department information
  departmentName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // User information who stored the key
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
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
privateKeySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries - ensure one private key per department
privateKeySchema.index({ departmentName: 1 }, { unique: true });
privateKeySchema.index({ username: 1 });
privateKeySchema.index({ userEmail: 1 });

const PrivateKey = mongoose.model('PrivateKey', privateKeySchema);

export default PrivateKey;


