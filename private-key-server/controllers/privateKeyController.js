import PrivateKey from '../models/PrivateKey.js';
import Permission from '../models/Permission.js';
import { encryptSecret, decryptSecret } from '../utils/cryptoUtils.js';

/**
 * Store encrypted private key
 * POST /private-key
 */
export const storePrivateKey = async (req, res) => {
  try {
    const { privateKey, departmentName } = req.body;

    // Validation
    if (!privateKey || !departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: privateKey and departmentName',
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

    const encryptedPayload = encryptSecret(privateKey.trim());

    // Create new private key record
    const newPrivateKey = new PrivateKey({
      encryptedPrivateKey: encryptedPayload.ciphertext,
      encryption: {
        algorithm: encryptedPayload.algorithm,
        iv: encryptedPayload.iv,
        authTag: encryptedPayload.authTag,
        fingerprint: encryptedPayload.fingerprint
      },
      departmentName: departmentName.toLowerCase().trim(),
      storedBy: {
        adminId: req.admin._id,
        username: req.admin.username,
        email: req.admin.email
      }
    });

    await newPrivateKey.save();

    res.status(201).json({
      success: true,
      message: 'Private key stored successfully',
      data: {
        id: newPrivateKey._id,
        departmentName: newPrivateKey.departmentName,
        storedBy: newPrivateKey.storedBy.username,
        createdAt: newPrivateKey.createdAt,
        fingerprint: newPrivateKey.encryption.fingerprint
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
    const actor = req.admin || req.user;

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT'
      });
    }
    if (!actor) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const requestedDepartment = departmentName.toLowerCase().trim();

    // Find private key for the department
    const privateKey = await PrivateKey.findOne({ 
      departmentName: requestedDepartment 
    });

    if (!privateKey) {
      return res.status(404).json({
        success: false,
        message: 'Private key not found for this department',
        code: 'KEY_NOT_FOUND'
      });
    }

    const decryptedKey = decryptSecret({
      ciphertext: privateKey.encryptedPrivateKey,
      iv: privateKey.encryption.iv,
      authTag: privateKey.encryption.authTag
    });

    if (req.admin) {
      return res.json({
        success: true,
        message: 'Private key retrieved successfully',
        data: {
          privateKey: decryptedKey,
          departmentName: privateKey.departmentName,
          storedBy: privateKey.storedBy,
          storedAt: privateKey.createdAt,
          encryptionFingerprint: privateKey.encryption.fingerprint,
          accessedVia: 'admin_session'
        }
      });
    }

    const userDepartment = actor.department?.toLowerCase().trim();
    if (userDepartment === requestedDepartment) {
      // User belongs to same department - grant access
      return res.json({
        success: true,
        message: 'Private key retrieved successfully',
        data: {
          privateKey: decryptedKey,
          departmentName: privateKey.departmentName,
          storedBy: privateKey.storedBy,
          storedAt: privateKey.createdAt,
          encryptionFingerprint: privateKey.encryption.fingerprint
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
        (allowedUser.userId && allowedUser.userId.toString() === actor.id.toString()) ||
        (allowedUser.username && allowedUser.username.toLowerCase() === actor.username.toLowerCase()) ||
        (allowedUser.userEmail && allowedUser.userEmail.toLowerCase() === actor.email.toLowerCase())
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
        privateKey: decryptedKey,
        departmentName: privateKey.departmentName,
        storedBy: privateKey.storedBy,
        storedAt: privateKey.createdAt,
        encryptionFingerprint: privateKey.encryption.fingerprint,
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

