import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import PublicKey from '../models/PublicKey.js';
import User from '../models/User.js';
import  Organization  from '../models/organization.js';
import { logger } from '../utils/logger.js';
import { validateKeyUpload, validateKeyQuery } from '../utils/validation.js';

const router = express.Router();

/**
 * @route POST /api/keys/public
 * @desc Upload public key for user in organization
 * @access Private (requires user to be authenticated)
 */
router.post('/public', authenticateToken, async (req, res) => {
  try {
    const { publicKeyPem, organizationName, keyType = 'RSA-OAEP', keySize = 2048 } = req.body;
    
    // Validate input
    const validation = validateKeyUpload({ publicKeyPem, organizationName });
    if (!validation.isValid) {
      logger.warn('Key upload validation failed', { 
        userId: req.user.id, 
        errors: validation.errors 
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid key data',
        errors: validation.errors
      });
    }

    // Find organization
    const organization = await Organization.findOne({ 
      name: organizationName.trim() 
    });
    
    if (!organization) {
      logger.warn('Key upload failed - organization not found', { 
        userId: req.user.id, 
        organizationName 
      });
      return res.status(400).json({
        success: false,
        message: `Organization '${organizationName}' not found`
      });
    }

    // Verify user belongs to this organization
    const user = await User.findOne({
      _id: req.user.id,
      organization: organization._id,
      isActive: true
    });

    if (!user) {
      logger.warn('Key upload failed - user not in organization', { 
        userId: req.user.id, 
        organizationId: organization._id 
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to upload keys for this organization'
      });
    }

    // Check if user already has an active key for this organization
    const existingKey = await PublicKey.findOne({
      user: req.user.id,
      organization: organization._id,
      isActive: true
    });

    if (existingKey) {
      logger.warn('Key upload failed - user already has active key', { 
        userId: req.user.id, 
        organizationId: organization._id 
      });
      return res.status(409).json({
        success: false,
        message: 'You already have an active public key for this organization. Please deactivate the existing key first.'
      });
    }

    // Create new public key record
    const newPublicKey = new PublicKey({
      organization: organization._id,
      user: req.user.id,
      organizationName: organization.name,
      username: user.username,
      publicKeyPem: publicKeyPem.trim(),
      keyType,
      keySize
    });

    logger.info('Attempting to save public key', {
      userId: req.user.id,
      organizationName: organization.name,
      publicKeyLength: publicKeyPem.trim().length
    });

    await newPublicKey.save();

    logger.info('Public key uploaded successfully', {
      keyId: newPublicKey.keyId,
      userId: req.user.id,
      organizationId: organization._id,
      organizationName: organization.name
    });

    res.status(201).json({
      success: true,
      message: 'Public key uploaded successfully',
      data: {
        keyId: newPublicKey.keyId,
        organizationName: organization.name,
        keyType: newPublicKey.keyType,
        keySize: newPublicKey.keySize,
        createdAt: newPublicKey.createdAt
      }
    });

  } catch (error) {
    logger.error('Key upload error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during key upload'
    });
  }
});

/**
 * @route GET /api/keys/organization/:organizationId
 * @desc Get all public keys for an organization
 * @access Private (requires user to be in the organization)
 */
router.get('/organization/:organizationId', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Validate organization ID
    if (!organizationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization ID format'
      });
    }

    // Check if user belongs to this organization
    const user = await User.findOne({
      _id: req.user.id,
      organization: organizationId,
      isActive: true
    });

    if (!user) {
      logger.warn('Key query failed - user not in organization', { 
        userId: req.user.id, 
        organizationId 
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view keys for this organization'
      });
    }

    // Get all active keys for the organization
    const keys = await PublicKey.findByOrganization(organizationId);

    res.json({
      success: true,
      message: 'Organization keys retrieved successfully',
      data: {
        organizationId,
        keys: keys.map(key => key.toSafeObject())
      }
    });

  } catch (error) {
    logger.error('Organization keys query error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during keys query'
    });
  }
});

/**
 * @route GET /api/keys/user/:userId/org/:organizationId
 * @desc Get specific user's public key in organization
 * @access Private (requires user to be in the organization)
 */
router.get('/user/:userId/org/:organizationId', authenticateToken, async (req, res) => {
  try {
    const { userId, organizationId } = req.params;
    
    // Validate IDs
    if (!userId.match(/^[0-9a-fA-F]{24}$/) || !organizationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user or organization ID format'
      });
    }

    // Check if requesting user belongs to this organization
    const requestingUser = await User.findOne({
      _id: req.user.id,
      organization: organizationId,
      isActive: true
    });

    if (!requestingUser) {
      logger.warn('User key query failed - requesting user not in organization', { 
        userId: req.user.id, 
        organizationId 
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view keys for this organization'
      });
    }

    // Get the specific user's key
    const key = await PublicKey.findByUserAndOrganization(userId, organizationId);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'No active public key found for this user in the organization'
      });
    }

    res.json({
      success: true,
      message: 'User key retrieved successfully',
      data: {
        key: key.getPublicKeyForEncryption()
      }
    });

  } catch (error) {
    logger.error('User key query error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during key query'
    });
  }
});

/**
 * @route GET /api/keys/public/:keyId
 * @desc Get public key by ID
 * @access Private (requires user to be in the same organization)
 */
router.get('/public/:keyId', authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;
    
    // Validate key ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid key ID format'
      });
    }

    // Get the key
    const key = await PublicKey.findByKeyId(keyId);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'Public key not found'
      });
    }

    // Check if requesting user belongs to the same organization
    const requestingUser = await User.findOne({
      _id: req.user.id,
      organization: key.organization,
      isActive: true
    });

    if (!requestingUser) {
      logger.warn('Key query failed - user not in same organization', { 
        userId: req.user.id, 
        keyOrganization: key.organization 
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this key'
      });
    }

    res.json({
      success: true,
      message: 'Public key retrieved successfully',
      data: {
        key: key.getPublicKeyForEncryption()
      }
    });

  } catch (error) {
    logger.error('Key query error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during key query'
    });
  }
});

/**
 * @route PUT /api/keys/public/:keyId
 * @desc Update public key
 * @access Private (requires key ownership)
 */
router.put('/public/:keyId', authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { publicKeyPem, keyType, keySize } = req.body;
    
    // Validate key ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid key ID format'
      });
    }

    // Get the key and verify ownership
    const key = await PublicKey.findOne({
      keyId: keyId,
      user: req.user.id,
      isActive: true
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'Public key not found or you are not authorized to update it'
      });
    }

    // Update key data
    const updateData = {};
    if (publicKeyPem) {
      const validation = validateKeyUpload({ publicKeyPem });
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid key data',
          errors: validation.errors
        });
      }
      updateData.publicKeyPem = publicKeyPem.trim();
    }
    if (keyType) updateData.keyType = keyType;
    if (keySize) updateData.keySize = keySize;

    const updatedKey = await PublicKey.findByIdAndUpdate(
      key._id,
      updateData,
      { new: true, runValidators: true }
    );

    logger.info('Public key updated successfully', {
      keyId: updatedKey.keyId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Public key updated successfully',
      data: {
        key: updatedKey.toSafeObject()
      }
    });

  } catch (error) {
    logger.error('Key update error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during key update'
    });
  }
});

/**
 * @route DELETE /api/keys/public/:keyId
 * @desc Deactivate public key
 * @access Private (requires key ownership)
 */
router.delete('/public/:keyId', authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;
    
    // Validate key ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid key ID format'
      });
    }

    // Deactivate the key
    const deactivatedKey = await PublicKey.deactivateKey(keyId);

    if (!deactivatedKey || deactivatedKey.user.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Public key not found or you are not authorized to deactivate it'
      });
    }

    logger.info('Public key deactivated successfully', {
      keyId: deactivatedKey.keyId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Public key deactivated successfully',
      data: {
        keyId: deactivatedKey.keyId,
        deactivatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Key deactivation error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during key deactivation'
    });
  }
});

/**
 * @route GET /api/keys/my-keys
 * @desc Get current user's keys across all organizations
 * @access Private
 */
router.get('/my-keys', authenticateToken, async (req, res) => {
  try {
    // Get all active keys for the current user
    const keys = await PublicKey.find({
      user: req.user.id,
      isActive: true
    }).populate('organization', 'name description');

    res.json({
      success: true,
      message: 'User keys retrieved successfully',
      data: {
        keys: keys.map(key => ({
          keyId: key.keyId,
          organizationName: key.organizationName,
          organization: key.organization,
          keyType: key.keyType,
          keySize: key.keySize,
          isPrimary: key.isPrimary,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt
        }))
      }
    });

  } catch (error) {
    logger.error('User keys query error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during user keys query'
    });
  }
});

export default router;
