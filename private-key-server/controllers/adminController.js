import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { generateAdminToken, revokeAdminToken } from '../middleware/adminAuth.js';

const normalizeUsername = (value) => value.trim().toLowerCase();

export const getAdminStatus = async (req, res) => {
  const adminCount = await Admin.countDocuments();
  const hasAdmin = adminCount > 0;
  res.json({
    success: true,
    data: {
      exists: hasAdmin,
    },
  });
};

export const registerAdmin = async (req, res) => {
  try {
    const existingAdmin = await Admin.countDocuments();
    if (existingAdmin > 0) {
      return res.status(409).json({
        success: false,
        message: 'Admin already exists. Please sign in.',
        code: 'ADMIN_EXISTS',
      });
    }

    const { username, email, firstName, lastName, password, confirmPassword } = req.body || {};

    if (!username || !email || !firstName || !lastName || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        code: 'MISSING_FIELDS',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
        code: 'PASSWORD_MISMATCH',
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters',
        code: 'WEAK_PASSWORD',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      username: normalizeUsername(username),
      email: email.trim().toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      passwordHash,
      lastLoginAt: new Date(),
    });

    const token = generateAdminToken(admin);

    res.status(201).json({
      success: true,
      message: 'Admin account created',
      data: {
        token,
        admin: admin.toSafeObject(),
      },
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register admin',
      code: 'ADMIN_REGISTER_ERROR',
    });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const admin = await Admin.findOne({
      username: normalizeUsername(username),
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to multiple failed attempts',
        code: 'ADMIN_LOCKED',
        data: {
          lockedUntil: admin.lockedUntil,
        },
      });
    }

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValid) {
      admin.failedLoginAttempts += 1;
      if (admin.failedLoginAttempts >= 5) {
        admin.lockedUntil = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
        admin.failedLoginAttempts = 0;
      }
      await admin.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateAdminToken(admin);

    res.json({
      success: true,
      message: 'Authenticated successfully',
      data: {
        token,
        admin: admin.toSafeObject(),
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate admin',
      code: 'ADMIN_LOGIN_ERROR',
    });
  }
};

export const logoutAdmin = async (req, res) => {
  revokeAdminToken(req.token);
  res.json({
    success: true,
    message: 'Disconnected from private-key-server',
  });
};

export const getAdminProfile = async (req, res) => {
  res.json({
    success: true,
    data: {
      admin: req.admin.toSafeObject(),
    },
  });
};

