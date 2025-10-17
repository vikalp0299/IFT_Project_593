import mongoose from 'mongoose';
import { databaseConfig } from './config/index.js';
import { logger } from './utils/logger.js';



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
