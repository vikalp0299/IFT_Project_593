import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

// Token blacklist to track logged out tokens
const tokenBlacklist = new Set();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate JWT tokens for a user
 * @param {Object} user - User object
 * @returns {Object} - Access and refresh tokens
 */
export const generateTokens = (user) => {
  const payload = {
    userId: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    organizationId: user.organization,
    organizationName: user.organizationName
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'safe-app',
    audience: 'safe-app-users'
  });

  const refreshToken = jwt.sign(
    { userId: user._id, type: 'refresh' }, 
    JWT_SECRET, 
    { 
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'safe-app',
      audience: 'safe-app-users'
    }
  );

  return { accessToken, refreshToken };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'safe-app',
      audience: 'safe-app-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Blacklist a token (for logout)
 * @param {string} token - JWT token to blacklist
 */
export const blacklistToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      // Store token with expiration time
      tokenBlacklist.add(token);
      
      // Clean up expired tokens periodically
      setTimeout(() => {
        tokenBlacklist.delete(token);
      }, (decoded.exp * 1000) - Date.now());
    }
  } catch (error) {
    logger.warn('Failed to blacklist token', { error: error.message });
  }
};

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token
 * @returns {boolean} - True if token is blacklisted
 */
export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Authentication middleware
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

    // Check if token is blacklisted (logged out)
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

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

    // Update last login
    user.lastLogin = new Date();
    await user.save();

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
      permissions: user.permissions || []
    };

    req.token = token;
    next();

  } catch (error) {
    logger.warn('Authentication failed', { 
      error: error.message, 
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token && !isTokenBlacklisted(token)) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
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
          permissions: user.permissions || []
        };
        req.token = token;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed', { error: error.message });
  }
  
  next();
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of allowed roles
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 * @param {Array} requiredPermissions - Array of required permissions
 */
export const requirePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.id,
        userPermissions,
        requiredPermissions,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Refresh token middleware
 * Generates new access token using refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Check if refresh token is blacklisted
    if (isTokenBlacklisted(refreshToken)) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked',
        code: 'REFRESH_TOKEN_REVOKED'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Fetch user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Blacklist old refresh token
    blacklistToken(refreshToken);

    logger.info('Token refreshed successfully', { userId: user._id });

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: JWT_EXPIRES_IN
      }
    });

  } catch (error) {
    logger.warn('Token refresh failed', { error: error.message });
    
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};

/**
 * Logout middleware
 * Blacklists the current token
 */
export const logout = (req, res) => {
  try {
    const token = req.token;
    
    if (token) {
      blacklistToken(token);
      logger.info('User logged out', { userId: req.user?.id });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * Get current user profile from token
 * @param {Object} req - Request object
 * @param {Array|String} fields - Optional fields to return (e.g., ['username', 'email'] or 'username email')
 * @returns {Object|null} - User data or null
 */
export async function getCurrentUser(req, fields = null) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return null;
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return null;
    }

    // Verify token and get userId
    const decoded = verifyToken(token);

    // Build select query based on fields parameter
    let selectFields = '';
    if (fields) {
      // Convert array to space-separated string or use string directly
      selectFields = Array.isArray(fields) ? fields.join(' ') : fields;
    }

    // Fetch user data with optional field selection
    const user = selectFields 
      ? await User.findById(decoded.userId).select(selectFields)
      : await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return null;
    }

    // If specific fields requested, return only those fields
    if (fields) {
      return user.toObject();
    }

    // Return all fields (default behavior)
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      password: user.password, // Hashed password
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      jobTitle: user.jobTitle,
      department: user.department,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      organization: user.organization,
      organizationName: user.organizationName,
      contactPreferences: user.contactPreferences,
      bio: user.bio,
      timezone: user.timezone,
      language: user.language,
      lastLogin: user.lastLogin,
      lastPasswordChange: user.lastPasswordChange,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

  } catch (error) {
    logger.error('Get current user error', { error: error.message });
    return null;
  }
};

export const getUserIdfromToken = (req) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return null;
    }

    // Verify token
    const decoded = verifyToken(token);
    return decoded.userId;

  } catch (error) {
    logger.warn('Failed to get userId from token', { error: error.message });
    return null;
  }
};

export const getUserRoleFromToken = (req) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return null;
    }

    // Verify token
    const decoded = verifyToken(token);
    return decoded.role;

  } catch (error) {
    logger.warn('Failed to get user role from token', { error: error.message });
    return null;
  }
};   

export const getOrganizationIdFromToken = (req) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return null;
    }

    // Verify token
    const decoded = verifyToken(token);
    return decoded.organizationId;

  } catch (error) {
    logger.warn('Failed to get organizationId from token', { error: error.message });
    return null;
  }
};
