import jwt from 'jsonwebtoken';
import OrganizationConfig from '../models/OrganizationConfig.js';
import { authenticateUser } from './userAuth.js';

/**
 * Authentication middleware for private key server
 * Only accepts private-key-server user tokens
 * Users must login to private-key-server to get a valid token
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

    // First, decode token without verification to determine token type
    let decodedUnverified;
    try {
      decodedUnverified = jwt.decode(token);
      if (!decodedUnverified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format',
          code: 'INVALID_TOKEN_FORMAT'
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Check if this is a private-key-server user token (has tokenType: 'user')
    if (decodedUnverified.tokenType === 'user' && decodedUnverified.iss === 'private-key-server') {
      // Use user authentication middleware - this is the only accepted method
      return authenticateUser(req, res, next);
    }

    // If not a private-key-server token, reject it
    // Users should login to private-key-server and use their token
    return res.status(401).json({
      success: false,
      message: 'Invalid token type. Please login to private-key-server to get a valid token.',
      code: 'INVALID_TOKEN_TYPE'
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};
