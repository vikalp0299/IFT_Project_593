import { generateKeyPairSync } from 'crypto';
import crypto from 'crypto';
import PrivateKey from '../models/PrivateKey.js';
import Permission from '../models/Permission.js';
import { encryptSecret, decryptSecret } from '../utils/cryptoUtils.js';

const normalize = (value = '') => value.toString().trim().toLowerCase();
const normalizeOrganizationName = (value) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toLowerCase();
  }
  if (value && typeof value.toString === 'function') {
    const converted = value.toString().trim();
    if (converted.length > 0) {
      return converted.toLowerCase();
    }
  }
  return 'default';
};

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
    const normalizedOrg = normalizeOrganizationName(organizationName);
    if (req.admin.organizationName !== normalizedOrg) {
      return res.status(403).json({
        success: false,
        message: 'Admin cannot manage another organization',
        code: 'ADMIN_ORG_CONFLICT',
      });
    }

    const existingKey = await PrivateKey.findOne({ 
      departmentName: normalize(departmentName),
      organizationName: normalizedOrg
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
      departmentName: normalize(departmentName),
      organizationName: normalizedOrg,
      organizationId: req.admin.organizationId || null,
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
    const organizationName =
      req.query.organizationName ||
      req.body?.organizationName ||
      req.headers['x-organization-name'] ||
      'default';
    const normalizedOrg = normalizeOrganizationName(organizationName);

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT'
      });
    }

    const privateKey = await PrivateKey.findOne({ 
      departmentName: normalize(departmentName),
      organizationName: normalizedOrg,
    });

    res.json({
      success: true,
      data: {
        exists: !!privateKey,
        departmentName: normalize(departmentName),
        organizationName: normalizedOrg,
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

    const normalizedName = normalize(departmentName);
    const normalizedOrgName = normalizeOrganizationName(organizationName);

    if (req.admin.organizationName !== normalizedOrgName) {
      return res.status(403).json({
        success: false,
        message: 'Admin cannot create departments for another organization',
        code: 'ADMIN_ORG_CONFLICT',
      });
    }
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
      organizationId: req.admin.organizationId || null,
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

export const deleteDepartment = async (req, res) => {
  try {
    const { organizationName, departmentName } = req.params;

    if (!organizationName || !departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Organization name and department name are required',
        code: 'MISSING_PARAMETERS',
      });
    }

    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED',
      });
    }

    const normalizedOrg = normalizeOrganizationName(organizationName);
    const normalizedDept = normalize(departmentName);

    if (req.admin.organizationName !== normalizedOrg) {
      return res.status(403).json({
        success: false,
        message: 'Admin cannot delete departments for another organization',
        code: 'ADMIN_ORG_CONFLICT',
      });
    }

    const deleted = await PrivateKey.findOneAndDelete({
      organizationName: normalizedOrg,
      departmentName: normalizedDept,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Department not found on private-key-server',
        code: 'DEPARTMENT_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      message: `Department "${deleted.displayName}" removed from private-key-server`,
    });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete department on private-key-server',
      code: 'DELETE_DEPARTMENT_ERROR',
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

    const requestedDepartment = normalize(departmentName);
    const actorOrg =
      (req.admin && req.admin.organizationName) ||
      (req.user && req.user.organizationName) ||
      null;
    if (!actorOrg) {
      return res.status(400).json({
        success: false,
        message: 'Organization context required',
        code: 'MISSING_ORGANIZATION',
      });
    }

    // Find private key for the department
    const normalizedActorOrg = normalizeOrganizationName(actorOrg);
    const privateKey = await PrivateKey.findOne({ 
      departmentName: requestedDepartment,
      organizationName: normalizedActorOrg,
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
          organizationName: privateKey.organizationName,
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
          organizationName: privateKey.organizationName,
          storedBy: privateKey.storedBy,
          storedAt: privateKey.createdAt,
          encryptionFingerprint: privateKey.encryption.fingerprint
        }
      });
    }

    // User is from different department - check permission list
    const permission = await Permission.findOne({ 
      departmentName: requestedDepartment,
      organizationName: normalizedActorOrg,
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
        organizationName: privateKey.organizationName,
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
      departmentName: normalize(departmentName),
      organizationName: req.admin?.organizationName || 'default',
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

/**
 * Decrypt symmetric key for file download
 * POST /private-key/decrypt-symmetric-key
 * - Verifies user belongs to the organization and department specified in access rights
 * - Decrypts the encrypted symmetric key using department's private key
 * - Returns ONLY the decrypted symmetric key (never the private key)
 */
export const decryptSymmetricKey = async (req, res) => {
  try {
    // Get authenticated user from middleware
    const authenticatedUser = req.user;
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const {
      encryptedSymmetricKey,
      organizationId,
      organizationName,
      departmentId,
      departmentName,
    } = req.body;

    // Validation
    if (!encryptedSymmetricKey || !organizationName || !departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: encryptedSymmetricKey, organizationName, departmentName',
        code: 'MISSING_FIELDS',
      });
    }

    // Normalize organization and department names from request
    const normalizedOrg = normalizeOrganizationName(organizationName);
    const normalizedDept = normalize(departmentName);

    // Get user's actual organization and department from JWT token (not from request body - prevents spoofing)
    const userOrgName = authenticatedUser.organizationName
      ? normalizeOrganizationName(authenticatedUser.organizationName)
      : null;
    const userDeptName = authenticatedUser.department
      ? normalize(authenticatedUser.department)
      : null;

    if (!userOrgName) {
      return res.status(400).json({
        success: false,
        message: 'User organization information is missing from authentication token',
        code: 'MISSING_USER_INFO',
      });
    }

    // Department might not be in token for older tokens - get it from request body as fallback
    // The request body contains departmentName from the file's access rights
    // We'll verify that the user's department (from token or request) matches the file's department
    // SECURITY: If department is not in token, we'll use the departmentName from request
    // but we still verify the organization matches (which is in the token)
    const deptNameToVerify = userDeptName || (departmentName ? normalize(departmentName) : null);
    
    if (!deptNameToVerify) {
      // Log for debugging
      console.warn('Department missing from token and request:', {
        hasTokenDept: !!userDeptName,
        hasRequestDept: !!departmentName,
        userOrg: userOrgName
      });
      
      return res.status(400).json({
        success: false,
        message: 'User department information is required. Please log in again to get an updated token with department information.',
        code: 'MISSING_DEPARTMENT_INFO',
      });
    }

    // CRITICAL SECURITY CHECK: Verify authenticated user belongs to the same organization and department
    // as specified in the file's access rights (prevent user from spoofing their org/dept)
    console.log('=== Organization Access Check ===');
    console.log('From request (file access rights):', {
      organizationName,
      normalizedOrg,
      departmentName,
      normalizedDept,
    });
    console.log('From JWT token (authenticated user):', {
      userOrgName,
      userDeptName,
      deptNameToVerify,
    });
    console.log('Match results:', {
      orgMatch: normalizedOrg === userOrgName,
      deptMatch: normalizedDept === deptNameToVerify,
    });
    
    if (normalizedOrg !== userOrgName) {
      console.error('Organization mismatch!', {
        expected: normalizedOrg,
        actual: userOrgName,
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied: Authenticated user does not belong to the organization specified in file access rights',
        code: 'ACCESS_DENIED_ORG',
      });
    }

    if (normalizedDept !== deptNameToVerify) {
      console.error('Department mismatch!', {
        expected: normalizedDept,
        actual: deptNameToVerify,
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied: Authenticated user does not belong to the department specified in file access rights',
        code: 'ACCESS_DENIED_DEPT',
      });
    }

    // Find private key for the department
    const privateKey = await PrivateKey.findOne({
      departmentName: normalizedDept,
      organizationName: normalizedOrg,
    });

    if (!privateKey) {
      return res.status(404).json({
        success: false,
        message: 'Private key not found for this department',
        code: 'KEY_NOT_FOUND',
      });
    }

    // Decrypt the department's private key
    const departmentPrivateKeyPem = decryptSecret({
      ciphertext: privateKey.encryptedPrivateKey,
      iv: privateKey.encryption.iv,
      authTag: privateKey.encryption.authTag,
    });

    // Decrypt the symmetric key using the department's private key
    let decryptedSymmetricKey;
    try {
      const privateKeyObj = crypto.createPrivateKey({
        key: departmentPrivateKeyPem,
        format: 'pem',
        type: 'pkcs8',
      });

      // SECURITY: Validate encrypted key format before decryption
      if (!encryptedSymmetricKey || typeof encryptedSymmetricKey !== 'string') {
        throw new Error('Invalid encrypted symmetric key format');
      }

      const encryptedBuffer = Buffer.from(encryptedSymmetricKey, 'base64');
      
      // SECURITY: Validate buffer size (RSA-OAEP encrypted data should be key size in bytes)
      // For 2048-bit RSA key, encrypted data should be 256 bytes
      if (encryptedBuffer.length === 0 || encryptedBuffer.length > 512) {
        throw new Error('Invalid encrypted symmetric key size');
      }

      const decrypted = crypto.privateDecrypt(
        {
          key: privateKeyObj,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedBuffer
      );

      // SECURITY: Validate decrypted key length (must be exactly 32 bytes for AES-256)
      if (decrypted.length !== 32) {
        console.error(`Invalid decrypted key length: ${decrypted.length}, expected 32`);
        throw new Error('Decrypted key length is invalid - possible tampering or wrong key');
      }

      decryptedSymmetricKey = decrypted.toString('base64');
    } catch (error) {
      console.error('Error decrypting symmetric key:', error);
      return res.status(500).json({
        success: false,
        message: `Failed to decrypt symmetric key: ${error.message}`,
        code: 'DECRYPTION_ERROR',
      });
    }

    // Return ONLY the decrypted symmetric key (never the private key)
    res.json({
      success: true,
      message: 'Symmetric key decrypted successfully',
      data: {
        symmetricKey: decryptedSymmetricKey, // Base64 encoded 32-byte key
        algorithm: 'AES-256-GCM',
      },
    });
  } catch (error) {
    console.error('Decrypt symmetric key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decrypt symmetric key',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
};

