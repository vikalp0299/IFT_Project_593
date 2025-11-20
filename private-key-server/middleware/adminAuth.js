import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { config } from '../config.js';

const revokedTokens = new Set();

export const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      adminId: admin._id.toString(),
      username: admin.username,
      tokenType: 'admin',
      role: 'Admin',
      organizationName: admin.organizationName,
      organizationDisplayName: admin.organizationDisplayName,
      organizationId: admin.organizationId,
    },
    config.jwtSecret,
    {
      expiresIn: '2h',
      issuer: 'private-key-server',
      audience: 'private-key-server-admins',
    }
  );
};

export const revokeAdminToken = (token) => {
  if (token) {
    revokedTokens.add(token);
    setTimeout(() => revokedTokens.delete(token), 1000 * 60 * 60 * 3); // auto-expire after 3h
  }
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin token required',
        code: 'NO_ADMIN_TOKEN',
      });
    }

    if (revokedTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired',
        code: 'ADMIN_TOKEN_REVOKED',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret, {
        issuer: 'private-key-server',
        audience: 'private-key-server-admins',
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin token',
        code: 'INVALID_ADMIN_TOKEN',
      });
    }

    if (decoded.tokenType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin token required',
        code: 'NOT_ADMIN_TOKEN',
      });
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found',
        code: 'ADMIN_NOT_FOUND',
      });
    }

    if (
      decoded.organizationName &&
      admin.organizationName !== decoded.organizationName
    ) {
      return res.status(403).json({
        success: false,
        message: 'Admin token organization mismatch',
        code: 'ADMIN_ORG_MISMATCH',
      });
    }

    req.admin = admin;
    req.organizationName = admin.organizationName;
    req.token = token;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate admin',
      code: 'ADMIN_AUTH_ERROR',
    });
  }
};

