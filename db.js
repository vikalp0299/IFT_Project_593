import mongoose from 'mongoose';
import { databaseConfig } from './config/index.js';
import { logger } from './utils/logger.js';

// Organization Schema for managing organizations
const organizationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  
  // Contact Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  
  // Address Information
  address: {
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    zipCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    }
  },
  
  // Business Information
  businessType: {
    type: String,
    required: true,
    enum: ['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Government', 'Other'],
    trim: true
  },
  industry: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  
  // Channel Information
  organizationChannels: {
    type: [String],
    default: [],
    lowercase: true
  },
  
  // Administrative Information
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Will be set after admin user is created
  },
  maxUsers: {
    type: Number,
    default: 50,
    min: 1,
    max: 10000
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Blockchain Information
  hasBlockchain: {
    type: Boolean,
    default: false
  },
  blockchainOrgName: {
    type: String,
    default: null,
    unique: true,
    sparse: true // Allows multiple null values but ensures unique non-null values
  }
}, { timestamps: true });

// Create Organization model
export const Organization = mongoose.model('Organization', organizationSchema);

export const connectDB = async () => {
  try {
    // Set mongoose options for better compatibility
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(databaseConfig.mongoUri, databaseConfig.options);
    
    logger.info(`MongoDB connected successfully`, { host: conn.connection.host });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    
    // Default organizations initialization removed - create organizations manually via frontend
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err.message, stack: err.stack });
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Make sure MongoDB is running on your system');
    console.log('💡 You can start MongoDB with: mongod');
    process.exit(1);
  }
};

// Default organizations initialization removed
// Organizations will be created manually through the frontend registration process

// Helper functions for organization management
export const createOrganization = async (organizationData) => {
  try {
    const org = new Organization({
      name: organizationData.name.toLowerCase(),
      displayName: organizationData.displayName,
      email: organizationData.email,
      phone: organizationData.phone,
      address: organizationData.address,
      businessType: organizationData.businessType,
      industry: organizationData.industry,
      website: organizationData.website || '',
      maxUsers: organizationData.maxUsers || 50,
      status: 'pending'
    });
    await org.save();
    return { success: true, organization: org };
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern.name ? 'name' : 'email';
      return { success: false, message: `Organization ${field} already exists` };
    }
    throw err;
  }
};

export const findOrganization = async (organizationName) => {
  try {
    const org = await Organization.findOne({ 
      name: organizationName.toLowerCase(),
      isActive: true 
    });
    return org;
  } catch (err) {
    throw err;
  }
};

// Graceful shutdown
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    console.log('✅ MongoDB connection closed');
  } catch (err) {
    logger.error('Error closing MongoDB connection', { error: err.message });
    console.error('❌ Error closing MongoDB connection:', err);
  }
};
