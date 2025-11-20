import mongoose from 'mongoose';
import Permission from '../models/Permission.js';
import PrivateKey from '../models/PrivateKey.js';
import User from '../models/User.js';

const normalize = (value = '') => value.toString().toLowerCase().trim();
const getOrganizationContext = (req, fallback = 'default') =>
  normalize(
    req.user?.organizationName ||
      req.admin?.organizationName ||
      req.body?.organizationName ||
      req.query?.organizationName ||
      fallback
  );

/**
 * Add user to permission list for a department
 * POST /permissions
 */
export const addUserToPermissionList = async (req, res) => {
  try {
    const { departmentName, userId, username, userEmail } = req.body;
    const addedBy = req.user.id;
    const normalizedOrg = getOrganizationContext(req);

    // Validation
    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT'
      });
    }

    if (!userId && !username && !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'At least one of userId, username, or userEmail is required',
        code: 'MISSING_USER_IDENTIFIER'
      });
    }

    // Check if private key exists for this department
    const privateKey = await PrivateKey.findOne({ 
      departmentName: normalize(departmentName),
      organizationName: normalizedOrg,
    });

    if (!privateKey) {
      return res.status(404).json({
        success: false,
        message: 'Private key does not exist for this department',
        code: 'KEY_NOT_FOUND'
      });
    }

    // Verify user exists if userId or userEmail is provided
    let userToAdd = null;
    if (userId) {
      userToAdd = await User.findOne({
        _id: userId,
        organizationName: normalizedOrg,
      });
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
    } else if (userEmail) {
      userToAdd = await User.findOne({
        email: userEmail.toLowerCase().trim(),
        organizationName: normalizedOrg,
      });
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email',
          code: 'USER_NOT_FOUND'
        });
      }
    } else if (username) {
      userToAdd = await User.findOne({
        username: username.toLowerCase().trim(),
        organizationName: normalizedOrg,
      });
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this username',
          code: 'USER_NOT_FOUND'
        });
      }
    }

    // Find or create permission document
    let permission = await Permission.findOne({ 
      departmentName: normalize(departmentName),
      organizationName: normalizedOrg,
    });

    if (!permission) {
      permission = new Permission({
        departmentName: normalize(departmentName),
        organizationName: normalizedOrg,
        organizationId: req.user?.organizationId || null,
        allowedUsers: []
      });
    }

    // Prepare user data to add
    const userData = {
      userId: userToAdd ? userToAdd._id : (userId ? new mongoose.Types.ObjectId(userId) : null),
      username: userToAdd ? userToAdd.username : (username ? username.toLowerCase().trim() : null),
      userEmail: userToAdd ? userToAdd.email : (userEmail ? userEmail.toLowerCase().trim() : null),
      addedAt: new Date(),
      addedBy: addedBy
    };

    // Check if user is already in the permission list
    const existingUser = permission.allowedUsers.find(allowedUser => {
      if (userData.userId && allowedUser.userId) {
        return allowedUser.userId.toString() === userData.userId.toString();
      }
      if (userData.username && allowedUser.username) {
        return allowedUser.username.toLowerCase() === userData.username.toLowerCase();
      }
      if (userData.userEmail && allowedUser.userEmail) {
        return allowedUser.userEmail.toLowerCase() === userData.userEmail.toLowerCase();
      }
      return false;
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User is already in the permission list',
        code: 'USER_ALREADY_EXISTS'
      });
    }

    // Add user to permission list
    permission.allowedUsers.push(userData);
    await permission.save();

    res.status(201).json({
      success: true,
      message: 'User added to permission list successfully',
      data: {
        departmentName: permission.departmentName,
        organizationName: permission.organizationName,
        user: {
          userId: userData.userId,
          username: userData.username,
          userEmail: userData.userEmail
        },
        addedAt: userData.addedAt,
        totalUsers: permission.allowedUsers.length
      }
    });

  } catch (error) {
    console.error('Add user to permission list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add user to permission list',
      code: 'ADD_ERROR',
      error: error.message
    });
  }
};

/**
 * Remove user from permission list
 * DELETE /permissions
 */
export const removeUserFromPermissionList = async (req, res) => {
  try {
    const { departmentName, userId, username, userEmail } = req.body;
    const normalizedOrg = getOrganizationContext(req);

    // Validation
    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT'
      });
    }

    if (!userId && !username && !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'At least one of userId, username, or userEmail is required',
        code: 'MISSING_USER_IDENTIFIER'
      });
    }

    // Find permission document
    const permission = await Permission.findOne({ 
      departmentName: normalize(departmentName),
      organizationName: normalizedOrg,
    });

    if (!permission || !permission.allowedUsers || permission.allowedUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permission list not found or is empty',
        code: 'PERMISSION_NOT_FOUND'
      });
    }

    // Find user in permission list
    const userIndex = permission.allowedUsers.findIndex(allowedUser => {
      if (userId && allowedUser.userId) {
        return (
          allowedUser.userId.toString() === userId.toString()
        );
      }
      if (username && allowedUser.username) {
        return allowedUser.username.toLowerCase() === username.toLowerCase().trim();
      }
      if (userEmail && allowedUser.userEmail) {
        return allowedUser.userEmail.toLowerCase() === userEmail.toLowerCase().trim();
      }
      return false;
    });

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found in permission list',
        code: 'USER_NOT_IN_LIST'
      });
    }

    // Remove user from permission list
    const removedUser = permission.allowedUsers[userIndex];
    permission.allowedUsers.splice(userIndex, 1);
    await permission.save();

    res.json({
      success: true,
      message: 'User removed from permission list successfully',
      data: {
        departmentName: permission.departmentName,
        organizationName: permission.organizationName,
        removedUser: {
          userId: removedUser.userId,
          username: removedUser.username,
          userEmail: removedUser.userEmail
        },
        remainingUsers: permission.allowedUsers.length
      }
    });

  } catch (error) {
    console.error('Remove user from permission list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove user from permission list',
      code: 'REMOVE_ERROR',
      error: error.message
    });
  }
};

/**
 * Get permission list for a department
 * GET /permissions/:departmentName
 */
export const getPermissionList = async (req, res) => {
  try {
    const { departmentName } = req.params;
    const normalizedOrg = getOrganizationContext(req, req.query.organizationName);

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT'
      });
    }

    // Find permission document
    const permission = await Permission.findOne({ 
      departmentName: normalize(departmentName),
      organizationName: normalizedOrg,
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission list not found for this department',
        code: 'PERMISSION_NOT_FOUND'
      });
    }

    // Populate user details if userId exists
    const allowedUsers = await Promise.all(
      permission.allowedUsers.map(async (allowedUser) => {
        if (allowedUser.userId) {
          const user = await User.findById(allowedUser.userId).select('username email firstName lastName role department');
          return {
            userId: allowedUser.userId,
            username: user ? user.username : allowedUser.username,
            userEmail: user ? user.email : allowedUser.userEmail,
            firstName: user ? user.firstName : null,
            lastName: user ? user.lastName : null,
            role: user ? user.role : null,
            department: user ? user.department : null,
            addedAt: allowedUser.addedAt,
            addedBy: allowedUser.addedBy
          };
        }
        return {
          userId: allowedUser.userId,
          username: allowedUser.username,
          userEmail: allowedUser.userEmail,
          addedAt: allowedUser.addedAt,
          addedBy: allowedUser.addedBy
        };
      })
    );

    res.json({
      success: true,
      data: {
        departmentName: permission.departmentName,
        organizationName: permission.organizationName,
        allowedUsers: allowedUsers,
        totalUsers: allowedUsers.length,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt
      }
    });

  } catch (error) {
    console.error('Get permission list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve permission list',
      code: 'RETRIEVAL_ERROR',
      error: error.message
    });
  }
};

