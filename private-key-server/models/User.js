import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Basic Authentication
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  department: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Role and Permissions
  role: {
    type: String,
    required: true,
    enum: ['Admin', 'Manager', 'Employee', 'Guest'],
    default: 'Employee'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin', 'manage_users', 'manage_organization']
  }],
  
  // Organization Association
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  organizationName: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Profile and Preferences
  profilePicture: {
    type: String, // URL to profile picture
    default: ''
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  language: {
    type: String,
    default: 'en'
  },
  
  // Contact Preferences
  contactPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },
  
  // Security
  securityQuestions: [{
    question: {
      type: String,
      trim: true
    },
    answer: {
      type: String,
      trim: true
    }
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date
  }
});

const User = mongoose.model('User', userSchema);

export default User;



