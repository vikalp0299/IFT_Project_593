import { generateKeyPairSync } from 'crypto';
import PrivateKey from '../models/PrivateKey.js';
import Permission from '../models/Permission.js';
import { encryptSecret, decryptSecret } from '../utils/cryptoUtils.js';

/**
 * Store encrypted private key
 * POST /private-key
 */
export const storePrivateKey = async (req, res) => {
  try {
    const { privateKey, departmentName, organizationName } = req.body;

    // Validation
    if (!privateKey || !departmentName || !organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: privateKey, departmentName, organizationName',
        code: 'MISSING_FIELDS'
      });
    }

    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED',
      });
    }

    // Check if private key already exists for this department
    const existingKey = await PrivateKey.findOne({ 
      departmentName: departmentName.toLowerCase().trim(),
      organizationName: organizationName.toLowerCase().trim()
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
      organizationName: organizationName.toLowerCase().trim(),
      displayName: departmentName.trim(),
      storedBy: {
        adminId: req.admin?._id,
        username: req.admin?.username || 'system',
        email: req.admin?.email || 'system@localhost'
      }
    });

    await newPrivateKey.save();

    res.status(201).json({
      success: true,
      message: 'Private key stored successfully',
      data: {
        id: newPrivateKey._id,
        departmentName: newPrivateKey.departmentName,
        organizationName: newPrivateKey.organizationName,
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
 * Create department and generate key pair
 * POST /departments
 */
export const createDepartmentWithKeys = async (req, res) => {
  try {
    const { departmentName, organizationName } = req.body || {};

    if (!departmentName || typeof departmentName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT',
      });
    }

    if (!organizationName || typeof organizationName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required',
        code: 'MISSING_ORGANIZATION',
      });
    }

    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED',
      });
    }

    const normalizedName = departmentName.toLowerCase().trim();
    const normalizedOrgName = organizationName.toLowerCase().trim();
    const displayName = departmentName.trim();

    const existingKey = await PrivateKey.findOne({ 
      departmentName: normalizedName,
      organizationName: normalizedOrgName,
    });
    if (existingKey) {
      return res.status(409).json({
        success: false,
        message: 'Department already exists on this private-key-server',
        code: 'DEPARTMENT_EXISTS',
      });
    }

    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const encryptedPayload = encryptSecret(privateKey);

    const newPrivateKey = await PrivateKey.create({
      encryptedPrivateKey: encryptedPayload.ciphertext,
      encryption: {
        algorithm: encryptedPayload.algorithm,
        iv: encryptedPayload.iv,
        authTag: encryptedPayload.authTag,
        fingerprint: encryptedPayload.fingerprint,
      },
      departmentName: normalizedName,
      organizationName: normalizedOrgName,
      displayName,
      storedBy: {
        adminId: req.admin._id,
        username: req.admin.username,
        email: req.admin.email,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Department created and keys generated successfully',
      data: {
        departmentName: newPrivateKey.displayName,
        normalizedDepartmentName: newPrivateKey.departmentName,
        organizationName: newPrivateKey.organizationName,
        publicKeyPem: publicKey,
        keyType: 'RSA-OAEP',
        keySize: 2048,
        fingerprint: newPrivateKey.encryption.fingerprint,
      },
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      code: 'DEPARTMENT_CREATE_ERROR',
      error: error.message,
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

/**
 * TEST ONLY: Admin endpoint to decrypt private key by department
 * GET /admin/decrypt/:departmentName
 */
export const adminTestDecryptPrivateKey = async (req, res) => {
  try {
    const { departmentName } = req.params;

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT',
      });
    }

    const privateKey = await PrivateKey.findOne({
      departmentName: departmentName.toLowerCase().trim(),
    });

    if (!privateKey) {
      return res.status(404).json({
        success: false,
        message: 'Private key not found for this department',
        code: 'KEY_NOT_FOUND',
      });
    }

    const decryptedKey = decryptSecret({
      ciphertext: privateKey.encryptedPrivateKey,
      iv: privateKey.encryption.iv,
      authTag: privateKey.encryption.authTag,
    });

    return res.json({
      success: true,
      message: 'TEST ONLY: decrypted private key returned',
      data: {
        departmentName: privateKey.departmentName,
        organizationName: privateKey.organizationName,
        privateKey: decryptedKey,
        fingerprint: privateKey.encryption.fingerprint,
        storedAt: privateKey.createdAt,
      },
      note: 'TEST ENDPOINT - remove before production',
    });
  } catch (error) {
    console.error('Admin test decrypt error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to decrypt private key',
      code: 'TEST_DECRYPT_ERROR',
      error: error.message,
    });
  }
};

