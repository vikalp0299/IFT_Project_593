import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: process.env.PRIVATE_KEY_SERVER_PORT || 8001,
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/safe-app',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  nodeEnv: process.env.NODE_ENV || 'development'
};

