import mongoose from 'mongoose';
import { databaseConfig } from './config/index.js';
import { logger } from './utils/logger.js';

// Organization Schema for managing organizations
const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Create Organization model
export const Organization = mongoose.model('Organization', organizationSchema);

export const connectDB = async () => {
  try {
    // Set mongoose options for better compatibility
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(databaseConfig.mongoUri, databaseConfig.options);
    
    logger.info(`MongoDB connected successfully`, { host: conn.connection.host });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    
    // Initialize default organizations if they don't exist
    await initializeDefaultOrganizations();
    
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

// Initialize default organizations
const initializeDefaultOrganizations = async () => {
  try {
    const defaultOrgs = [
      { name: 'test_org', displayName: 'Test Organization' },
      { name: 'demo_org', displayName: 'Demo Organization' }
    ];

    for (const org of defaultOrgs) {
      const existingOrg = await Organization.findOne({ name: org.name });
      if (!existingOrg) {
        await Organization.create(org);
        logger.info('Created default organization', { organizationName: org.displayName });
        console.log(`✅ Created default organization: ${org.displayName}`);
      }
    }
  } catch (err) {
    logger.error('Error initializing default organizations', { error: err.message });
    console.error('❌ Error initializing default organizations:', err);
  }
};

// Helper functions for organization management
export const createOrganization = async (organizationName) => {
  try {
    const org = new Organization({
      name: organizationName.toLowerCase(),
      displayName: organizationName
    });
    await org.save();
    return { success: true, organization: org };
  } catch (err) {
    if (err.code === 11000) {
      return { success: false, message: 'Organization already exists' };
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
