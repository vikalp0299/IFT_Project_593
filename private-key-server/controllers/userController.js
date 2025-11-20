import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import PrivateKey from '../models/PrivateKey.js';
import OrganizationConfig from '../models/OrganizationConfig.js';
import { generateUserToken, revokeUserToken } from '../middleware/userAuth.js';

const normalize = (value = '') => value.toLowerCase().trim();
const normalizeUsername = (value) => value.trim().toLowerCase();
const normalizeOrganizationName = (value) =>
  (value && typeof value === 'string' && value.trim().length > 0
    ? value.trim().toLowerCase()
    : null);

export const registerLocalUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      jobTitle,
      departmentName,
      organizationName,
      phone,
      role = 'Employee',
      organizationId,
    } = req.body || {};

    if (!username || !email || !password || !firstName || !lastName || !departmentName || !organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
    }

    const normalizedOrg = normalize(organizationName);
    const normalizedDepartment = normalize(departmentName);

    let departmentRecord = await PrivateKey.findOne({
      organizationName: normalizedOrg,
      departmentName: normalizedDepartment,
    });

    if (!departmentRecord) {
      // Backward compatibility for departments created before organizationName was required
      departmentRecord = await PrivateKey.findOne({
        departmentName: normalizedDepartment,
      });
    }

    if (!departmentRecord) {
      return res.status(404).json({
        success: false,
        message: 'Department not found on private-key-server',
        code: 'DEPARTMENT_NOT_FOUND',
      });
    }

    const normalizedUsername = normalize(username);
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({
      organizationName: normalizedOrg,
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists on private-key-server',
        code: 'USER_EXISTS',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const organizationObjectId =
      organizationId && mongoose.Types.ObjectId.isValid(organizationId)
        ? new mongoose.Types.ObjectId(organizationId)
        : undefined;

    const resolvedOrganizationId = organizationId || departmentRecord.organizationId || null;
    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      jobTitle: jobTitle?.trim() || 'Member',
      phone: phone?.trim() || '',
      department: normalizedDepartment,
      departmentDisplayName: departmentRecord.displayName || departmentName.trim(),
      organizationName: normalizedOrg,
      organizationDisplayName: organizationName.trim(),
      organizationId: resolvedOrganizationId,
      role,
      status: 'active',
      ...(organizationObjectId ? { organization: organizationObjectId } : {}),
    });

    // Auto-configure organization if not already configured
    let orgConfig = await OrganizationConfig.findOne({
      organizationName: normalizedOrg,
      isActive: true,
    });

    if (!orgConfig || !orgConfig.jwtSecret) {
      const { config } = await import('../config.js');
      const fallbackJwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
      
      if (!orgConfig) {
        try {
          orgConfig = await OrganizationConfig.create({
            organizationName: normalizedOrg,
            organizationDisplayName: organizationDisplayName || normalizedOrg,
            organizationId: organizationId || null,
            jwtSecret: fallbackJwtSecret,
            isActive: true,
            configuredBy: 'system-auto',
          });
          console.log(`Auto-configured organization "${normalizedOrg}" during user registration`);
        } catch (createError) {
          // If create fails, try to find it again
          orgConfig = await OrganizationConfig.findOne({
            organizationName: normalizedOrg,
          });
        }
      }
      
      if (orgConfig && !orgConfig.jwtSecret) {
        orgConfig.jwtSecret = fallbackJwtSecret;
        orgConfig.isActive = true;
        await orgConfig.save();
        console.log(`Auto-updated organization "${normalizedOrg}" with JWT_SECRET during user registration`);
      }
    }

    const token = generateUserToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'User created on private-key-server',
      data: {
        token,
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          department: newUser.department,
          departmentDisplayName: newUser.departmentDisplayName,
          organizationName: newUser.organizationName,
          organizationDisplayName: newUser.organizationDisplayName,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    console.error('registerLocalUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user on private-key-server',
      code: 'USER_CREATE_ERROR',
      error: error.message,
    });
  }
};

/**
 * Login user to private-key-server
 * POST /users/login
 */
export const loginUser = async (req, res) => {
  try {
    const { username, password, organizationName } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const normalizedOrg = normalizeOrganizationName(organizationName);
    const user = await User.findOne({
      username: normalizeUsername(username),
      ...(normalizedOrg ? { organizationName: normalizedOrg } : {}),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User account is not active',
        code: 'USER_INACTIVE',
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    // Auto-configure organization if not already configured (during login)
    const normalizedOrgForConfig = normalizeOrganizationName(organizationName) || user.organizationName;
    if (normalizedOrgForConfig) {
      const normalizedOrgName = normalize(normalizedOrgForConfig);
      let orgConfig = await OrganizationConfig.findOne({
        organizationName: normalizedOrgName,
        isActive: true,
      });

      if (!orgConfig || !orgConfig.jwtSecret) {
        const { config } = await import('../config.js');
        const fallbackJwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        
        if (!orgConfig) {
          try {
            orgConfig = await OrganizationConfig.create({
              organizationName: normalizedOrgName,
              organizationDisplayName: user.organizationDisplayName || normalizedOrgName,
              organizationId: user.organizationId || null,
              jwtSecret: fallbackJwtSecret,
              isActive: true,
              configuredBy: 'system-auto',
            });
            console.log(`Auto-configured organization "${normalizedOrgName}" during user login`);
          } catch (createError) {
            // If create fails, try to find it again
            orgConfig = await OrganizationConfig.findOne({
              organizationName: normalizedOrgName,
            });
          }
        }
        
        if (orgConfig && !orgConfig.jwtSecret) {
          orgConfig.jwtSecret = fallbackJwtSecret;
          orgConfig.isActive = true;
          await orgConfig.save();
          console.log(`Auto-updated organization "${normalizedOrgName}" with JWT_SECRET during user login`);
        }
      }
    }

    const token = generateUserToken(user);

    res.json({
      success: true,
      message: 'Authenticated successfully',
      data: {
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department,
          departmentDisplayName: user.departmentDisplayName,
          organizationName: user.organizationName,
          organizationDisplayName: user.organizationDisplayName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate user',
      code: 'USER_LOGIN_ERROR',
    });
  }
};

/**
 * Logout user from private-key-server
 * POST /users/logout
 */
export const logoutUser = async (req, res) => {
  revokeUserToken(req.token);
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Get user profile
 * GET /users/profile
 */
export const getUserProfile = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id.toString(),
        username: req.user.username,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        jobTitle: req.user.jobTitle,
        phone: req.user.phone,
        department: req.user.department,
        departmentDisplayName: req.user.departmentDisplayName,
        organizationName: req.user.organizationName,
        organizationDisplayName: req.user.organizationDisplayName,
        role: req.user.role,
        status: req.user.status,
        lastLoginAt: req.user.lastLoginAt,
      },
    },
  });
};

/**
 * Get user status (check if user exists)
 * GET /users/status
 */
export const getUserStatus = async (req, res) => {
  const normalizedOrg = normalizeOrganizationName(
    req.query.organizationName || req.body?.organizationName
  );
  const username = req.query.username || req.body?.username;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'Username is required',
      code: 'MISSING_USERNAME',
    });
  }

  const query = {
    username: normalizeUsername(username),
    ...(normalizedOrg ? { organizationName: normalizedOrg } : {}),
  };

  const userCount = await User.countDocuments(query);
  const exists = userCount > 0;

  res.json({
    success: true,
    data: {
      exists,
      organizationName: normalizedOrg,
      username: normalizeUsername(username),
    },
  });
};

