import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config.js';

const revokedTokens = new Set();

export const generateUserToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
      tokenType: 'user',
      role: user.role || 'Employee',
      organizationName: user.organizationName,
      organizationDisplayName: user.organizationDisplayName,
      organizationId: user.organizationId,
      department: user.department,
      departmentDisplayName: user.departmentDisplayName,
    },
    config.jwtSecret,
    {
      expiresIn: '24h',
      issuer: 'private-key-server',
      audience: 'private-key-server-users',
    }
  );
};

export const revokeUserToken = (token) => {
  if (token) {
    revokedTokens.add(token);
    setTimeout(() => revokedTokens.delete(token), 1000 * 60 * 60 * 25); // auto-expire after 25h
  }
};

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'User token required',
        code: 'NO_USER_TOKEN',
      });
    }

    if (revokedTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired',
        code: 'USER_TOKEN_REVOKED',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret, {
        issuer: 'private-key-server',
        audience: 'private-key-server-users',
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user token',
        code: 'INVALID_USER_TOKEN',
      });
    }

    if (decoded.tokenType !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'User token required',
        code: 'NOT_USER_TOKEN',
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User account is not active',
        code: 'USER_INACTIVE',
      });
    }

    if (
      decoded.organizationName &&
      user.organizationName !== decoded.organizationName
    ) {
      return res.status(403).json({
        success: false,
        message: 'User token organization mismatch',
        code: 'USER_ORG_MISMATCH',
      });
    }

    req.user = user;
    req.organizationName = user.organizationName;
    req.token = token;
    next();
  } catch (error) {
    console.error('User authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate user',
      code: 'USER_AUTH_ERROR',
    });
  }
};

