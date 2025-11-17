import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Authentication middleware for private key server
 * Verifies JWT token and attaches user to request
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'safe-app',
        audience: 'safe-app-users'
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Fetch user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Attach user info to request
    req.user = {
      id: user._id,
      userId: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organization,
      organizationName: user.organizationName,
      department: user.department,
      permissions: user.permissions || []
    };

    req.token = token;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

