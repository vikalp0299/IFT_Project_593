import PrivateKey from '../models/PrivateKey.js';
import Permission from '../models/Permission.js';
import User from '../models/User.js';

/**
 * Store encrypted private key
 * POST /private-key
 */
export const storePrivateKey = async (req, res) => {
  try {
    const { privateKey, departmentName, username, userEmail } = req.body;

    // Validation
    if (!privateKey || !departmentName || !username || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: privateKey, departmentName, username, userEmail',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if private key already exists for this department
    const existingKey = await PrivateKey.findOne({ 
      departmentName: departmentName.toLowerCase().trim() 
    });

    if (existingKey) {
      return res.status(409).json({
        success: false,
        message: 'Private key already exists for this department',
        code: 'KEY_EXISTS',
        data: {
          departmentName: existingKey.departmentName,
          exists: true
        }
      });
    }

    // Create new private key record
    const newPrivateKey = new PrivateKey({
      privateKey: privateKey.trim(),
      departmentName: departmentName.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
      userEmail: userEmail.toLowerCase().trim()
    });

    await newPrivateKey.save();

    res.status(201).json({
      success: true,
      message: 'Private key stored successfully',
      data: {
        id: newPrivateKey._id,
        departmentName: newPrivateKey.departmentName,
        username: newPrivateKey.username,
        userEmail: newPrivateKey.userEmail,
        createdAt: newPrivateKey.createdAt
      }
    });

  } catch (error) {
    console.error('Store private key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store private key',
      code: 'STORAGE_ERROR',
      error: error.message
    });
  }
};

/**
 * Check if private key exists for department
 * GET /private-key/check/:departmentName
 */
export const checkPrivateKeyExists = async (req, res) => {
  try {
    const { departmentName } = req.params;

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT'
      });
    }

    const privateKey = await PrivateKey.findOne({ 
      departmentName: departmentName.toLowerCase().trim() 
    });

    res.json({
      success: true,
      data: {
        exists: !!privateKey,
        departmentName: departmentName.toLowerCase().trim()
      }
    });

  } catch (error) {
    console.error('Check private key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check private key',
      code: 'CHECK_ERROR',
      error: error.message
    });
  }
};

/**
 * Get private key for authenticated user
 * GET /private-key/:departmentName
 * - If user belongs to same department → give private key
 * - If user from different department → check permission list
 * - If in permission list → give private key
 * - Otherwise → deny access
 */
export const getPrivateKey = async (req, res) => {
  try {
    const { departmentName } = req.params;
    const user = req.user;

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT'
      });
    }

    // Find private key for the department
    const privateKey = await PrivateKey.findOne({ 
      departmentName: departmentName.toLowerCase().trim() 
    });

    if (!privateKey) {
      return res.status(404).json({
        success: false,
        message: 'Private key not found for this department',
        code: 'KEY_NOT_FOUND'
      });
    }

    // Check if user belongs to the same department
    const userDepartment = user.department?.toLowerCase().trim();
    const requestedDepartment = departmentName.toLowerCase().trim();

    if (userDepartment === requestedDepartment) {
      // User belongs to same department - grant access
      return res.json({
        success: true,
        message: 'Private key retrieved successfully',
        data: {
          privateKey: privateKey.privateKey,
          departmentName: privateKey.departmentName,
          storedBy: {
            username: privateKey.username,
            userEmail: privateKey.userEmail
          },
          storedAt: privateKey.createdAt
        }
      });
    }

    // User is from different department - check permission list
    const permission = await Permission.findOne({ 
      departmentName: requestedDepartment 
    });

    if (!permission || !permission.allowedUsers || permission.allowedUsers.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to access this private key',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if user is in the permission list
    const isAllowed = permission.allowedUsers.some(allowedUser => {
      return (
        (allowedUser.userId && allowedUser.userId.toString() === user.id.toString()) ||
        (allowedUser.username && allowedUser.username.toLowerCase() === user.username.toLowerCase()) ||
        (allowedUser.userEmail && allowedUser.userEmail.toLowerCase() === user.email.toLowerCase())
      );
    });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not in the permission list for this department',
        code: 'NOT_IN_PERMISSION_LIST'
      });
    }

    // User is in permission list - grant access
    res.json({
      success: true,
      message: 'Private key retrieved successfully',
      data: {
        privateKey: privateKey.privateKey,
        departmentName: privateKey.departmentName,
        storedBy: {
          username: privateKey.username,
          userEmail: privateKey.userEmail
        },
        storedAt: privateKey.createdAt,
        accessedVia: 'permission_list'
      }
    });

  } catch (error) {
    console.error('Get private key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve private key',
      code: 'RETRIEVAL_ERROR',
      error: error.message
    });
  }
};

