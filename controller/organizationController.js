import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { Organization } from '../db.js';
import Department from '../models/Department.js';
import { verifyToken,getOrganizationIdFromToken,getUserIdfromToken,getUserRoleFromToken } from '../middleware/auth.js';
import  Access  from '../models/access.js';
import { request } from 'express';
import PublicKey from '../models/PublicKey.js';

// const getOrganizationIdFromToken = (req) => {
//     const token = req.headers.authorization.split(' ')[1];
//     const decodedToken = verifyToken(token);
//     return decodedToken.organizationId;
// }
// Organization Management Endpoints
/**
 * @route POST /org/validate-organization
 * @desc Validate and create new organization
 * @access Public
 */

export async function validateOrganization(req, res) {
    try {
        const {
            name,
            displayName,
            email,
            phone,
            address,
            businessType,
            industry,
            website,
            maxUsers
        } = req.body;
    
        // Validate required fields
        const errors = [];
        
        if (!name || name.trim().length < 2) {
        errors.push('Organization name is required and must be at least 2 characters');
        }
        if (!displayName || displayName.trim().length < 2) {
        errors.push('Display name is required and must be at least 2 characters');
        }
        if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        errors.push('Valid email is required');
        }
        if (!phone || !/^[\+]?[1-9][\d]{0,15}$/.test(phone)) {
        errors.push('Valid phone number is required');
        }
        if (!address || !address.street || !address.city || !address.state || !address.zipCode || !address.country) {
        errors.push('Complete address information is required');
        }
        if (!businessType || !['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Government', 'Other'].includes(businessType)) {
        errors.push('Valid business type is required');
        }
        if (!industry || industry.trim().length < 2) {
        errors.push('Industry is required and must be at least 2 characters');
        }
        
        if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
        }

        // Check if organization already exists (by name or email)
        const { Organization, createOrganization } = await import('../db.js');
        const existingOrgByName = await Organization.findOne({ 
        name: name.toLowerCase().trim() 
        });
        const existingOrgByEmail = await Organization.findOne({ 
        email: email.toLowerCase().trim() 
        });
        
        if (existingOrgByName) {
        return res.status(409).json({
            success: false,
            message: 'Organization name already exists. Please choose a different name.'
        });
        }
        
        if (existingOrgByEmail) {
        return res.status(409).json({
            success: false,
            message: 'Organization email already exists. Please use a different email address.'
        });
        }

        // Create the organization with comprehensive data
        const organizationData = {
        name: name.toLowerCase().trim(),
        displayName: displayName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        address: {
            street: address.street.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            zipCode: address.zipCode.trim(),
            country: address.country.trim()
        },
        businessType: businessType,
        industry: industry.trim(),
        website: website ? website.trim() : '',
        maxUsers: maxUsers || 50
        };
        
        const result = await createOrganization(organizationData);
        
        if (result.success) {
        res.status(201).json({
            success: true,
            message: 'Organization registered successfully',
            data: {
            organizationId: result.organization._id,
            name: result.organization.name,
            displayName: result.organization.displayName,
            email: result.organization.email,
            status: result.organization.status,
            createdAt: result.organization.createdAt
            }
        });
        } else {
        res.status(500).json({
            success: false,
            message: result.message || 'Failed to create organization'
        });
        }

    } catch (error) {
        res.status(500).json({
        success: false,
        message: 'Internal server error'
        });
    }
}

export async function listOrganizations(req, res) {
  try {
    const excludeSelf = req.query.excludeSelf === 'true';
    const currentOrgName = req.user?.organizationName?.toLowerCase().trim();

    const filter = {};
    if (excludeSelf && currentOrgName) {
      filter.name = { $ne: currentOrgName };
    }

    const organizations = await Organization.find(filter, {
      _id: 1,
      name: 1,
      displayName: 1,
    })
      .sort({ displayName: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        organizations,
      },
    });
  } catch (error) {
    console.error('listOrganizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizations',
    });
  }
}

/**
 * Get local server (private-key-server) URL for the authenticated user's organization
 * GET /org/local-server
 */
export async function getLocalServerUrl(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const organizationId = req.user?.organizationId || req.user?.organization;

    if (!userId || !organizationId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const { default: LocalServer } = await import('../models/LocalServer.js');
    const localServer = await LocalServer.findOne({
      organization: organizationId,
      isActive: true,
    }).lean();

    if (!localServer) {
      return res.status(404).json({
        success: false,
        message: 'Private-key-server not configured for your organization',
      });
    }

    res.json({
      success: true,
      data: {
        baseUrl: localServer.baseUrl,
        isActive: localServer.isActive,
      },
    });
  } catch (error) {
    console.error('getLocalServerUrl error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch local server URL',
    });
  }
}


/**
 * @route POST /org/validate-signin-organization
 * @desc Validate existing organization for sign-in
 * @access Public
 */
export async function validate_signin_organization(req, res) {
     try {
        const { organizationName } = req.body;
        
        // Input validation
        if (!organizationName || typeof organizationName !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Organization name is required and must be a string'
          });
        }
    
        const sanitizedOrgName = organizationName.trim();
    
        // Check if organization exists
        const { findOrganization } = await import('../db.js');
        const organization = await findOrganization(sanitizedOrgName);
        
        if (!organization) {
          return res.status(404).json({
            success: false,
            message: 'Organization not found. Please check the organization name and try again.'
          });
        }
        
        res.json({
          success: true,
          message: 'Organization found',
          data: {
            organizationName: organization.displayName,
            organizationId: organization._id,
            validatedAt: new Date().toISOString()
          }
        });
    
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
}

export async function getOrganizationChannels(req, res) {
  try {
    const { organizationName } = req.body;
    
    if (!organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }
    
    const { Organization } = await import('../db.js');
    const organizationChannels = await Organization.findOne(
      { name: organizationName.toLowerCase() },
      { organizationChannels: 1, _id: 0 }
    );
    
    res.json({
      success: true,
      data: organizationChannels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export async function putOrganizationChannels(req, res) {
  try {
    let { organizationName, channels } = req.body;
    
    // Validate required fields
    if (!organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }
    
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Channels must be a non-empty array'
      });
    }
    
    // Sanitize inputs
    organizationName = organizationName.toLowerCase();
    channels = channels.map(channel => channel.toLowerCase());
    
    const { Organization } = await import('../db.js');
    const organizationChannels = await Organization.findOne(
      { name: organizationName },
      { organizationChannels: 1, _id: 0 }
    );
    
    const existingChannels = organizationChannels?.organizationChannels || [];
    const newChannels = channels.filter(channel => !existingChannels.includes(channel));
    const existingInRequest = channels.filter(channel => existingChannels.includes(channel));

    // If no new channels to add
    if (newChannels.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All channels already present',
        alreadyPresent: existingInRequest,
        added: []
      });
    }

    // Combine existing and new channels
    const updatedChannels = [...existingChannels, ...newChannels];

    const organization = await Organization.findOneAndUpdate(
      { name: organizationName },
      { $set: { organizationChannels: updatedChannels } },
      { new: true }
    );
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Channels added successfully',
      data: {
        organizationChannels: organization.organizationChannels,
        added: newChannels,
        alreadyPresent: existingInRequest
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export async function requestAccessToChannel(req, res) {
  try {
    const channelName  = req.body.channelName;
    console.log('Channel name received for access request:', channelName);
    const organizationId = getOrganizationIdFromToken(req);
    console.log('Organization ID from token:', organizationId);
    if (!organizationId || !channelName) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID and channel name are required'
      });
    }
    const channels = await Organization.findOne({ _id: organizationId }, { organizationChannels: 1, _id: 0 });
    console.log('Organization channels:', channels.organizationChannels);
    if (!channels.organizationChannels.includes(channelName)) {
      return res.status(400).json({
        success: false,
        message: 'Channel does not exist in the organization'
      });
    }
    
    const accessRequest = {
      userId: getUserIdfromToken(req),
      organizationId,
      channelName,
      access: 'pending'
    };

    const createdRequest = await Access.create(accessRequest);

    res.json({
      success: true,
      message: 'Access request submitted successfully',
      data: createdRequest
    });
  } catch (error) {
    console.error('Error requesting access to channel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export async function displayAccessRequestsToAdmin(req, res) {
  try {
    const loggedUserId = getUserIdfromToken(req);
    if (!loggedUserId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    } 
    
    const userRole = getUserRoleFromToken(req);
    const storedUserRole = await User.findById(loggedUserId).select('role');
    console.log('Stored user role:', storedUserRole.role);
    if (storedUserRole.role !== userRole && storedUserRole.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    const organizationId = getOrganizationIdFromToken(req);
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }
    const accessRequests = await Access.find({ organizationId: organizationId },{_id:0,userId:1,channelName:1,access:1});
    console.log('Access requests fetched from DB:', accessRequests);
    console.log('Access requests fetched:', accessRequests.channelName);
    const userId = accessRequests.length > 0 ? accessRequests[0].userId : null;
    const userName = await User.findById(userId).select('username');
    console.log('User name fetched:', userName.username);
    const payload = accessRequests.map(request => ({
      username: userName.username,
      channelName: request.channelName,
      access: request.access
    }));
    console.log('Access requests payload:', payload);
    res.json({
      success: true,
      data: payload
    });
  } catch (error) {
    console.error('Error fetching access requests:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}

export async function respondToAccessRequest(req, res) {
  try{
    const { username, channelName, access } = req.body;
    if (!username || !channelName || !access) {
      return res.status(400).json({
        success: false,
        message: 'username, channelName, and access status are required'
      });
    }
    if (!['approved', 'denied'].includes(access)) {
      return res.status(400).json({
        success: false,
        message: 'Access status must be either "approved" or "denied"'
      });
    }
    //const organizationId = getOrganizationIdFromToken(req);
    const userId = await User.findOne({ username: username }).select('_id');
    if (!userId) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const organizationId = getOrganizationIdFromToken(req);
    const updatedRequest = await Access.findOneAndUpdate(
      { userId: userId, organizationId: organizationId, channelName: channelName },
      { $set: { access: access } },
      { new: true }
    );
    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Access request not found'
      });
    }
    res.json({
      success: true,
      message: 'Access request updated successfully',
      data: updatedRequest
    });
  }catch(error){
    console.error('Error responding to access request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } 
}

export async function getOrganizationDepartments(req, res) {
  try {
    const { organizationName } = req.params;

    if (!organizationName || typeof organizationName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required',
      });
    }

    const normalizedName = organizationName.toLowerCase().trim();
    const organization = await Organization.findOne({ name: normalizedName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    const departments = await Department.find({ organization: organization._id })
      .sort({ displayName: 1 })
      .populate({
        path: 'publicKey',
        select: 'keyId keyType keySize createdAt isActive ownerType',
      })
      .lean();

    return res.json({
      success: true,
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          displayName: organization.displayName,
        },
        departments: departments.map((dept) => ({
          id: dept._id,
          name: dept.departmentName,
          displayName: dept.displayName,
          publicKey: dept.publicKey
            ? {
                keyId: dept.publicKey.keyId,
                keyType: dept.publicKey.keyType,
                keySize: dept.publicKey.keySize,
                createdAt: dept.publicKey.createdAt,
                isActive: dept.publicKey.isActive,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error('getOrganizationDepartments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch departments for organization',
    });
  }
}

export async function createDepartmentWithPublicKey(req, res) {
  let publicKeyRecord = null;
  try {
    const { departmentName, publicKeyPem, keyType = 'RSA-OAEP', keySize = 2048 } = req.body || {};

    if (!departmentName || !publicKeyPem) {
      return res.status(400).json({
        success: false,
        message: 'Department name and public key are required',
        code: 'MISSING_FIELDS',
      });
    }

    if (!req.user || !req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context missing',
        code: 'ORG_CONTEXT_MISSING',
      });
    }

    const normalizedName = departmentName.toLowerCase().trim();
    const displayName = departmentName.trim();
    const normalizedOrgName = req.user.organizationName?.toLowerCase().trim() || '';

    const existing = await Department.findOne({
      organization: req.user.organizationId,
      departmentName: normalizedName,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Department already exists for this organization',
        code: 'DEPARTMENT_EXISTS',
        data: {
          departmentId: existing._id,
        },
      });
    }

    const departmentObjectId = new mongoose.Types.ObjectId();

    publicKeyRecord = await PublicKey.create({
      organization: req.user.organizationId,
      organizationName: normalizedOrgName,
      department: departmentObjectId,
      departmentName: normalizedName,
      publicKeyPem: publicKeyPem.trim(),
      keyType,
      keySize,
      createdBy: {
        userId: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
    });

    const department = await Department.create({
      _id: departmentObjectId,
      organization: req.user.organizationId,
      organizationName: normalizedOrgName,
      departmentName: normalizedName,
      displayName,
      publicKey: publicKeyRecord._id,
      createdBy: {
        userId: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department.toResponse(),
    });
  } catch (error) {
    if (publicKeyRecord?._id) {
      try {
        await PublicKey.deleteOne({ _id: publicKeyRecord._id });
      } catch (cleanupError) {
        console.error('Failed to remove orphan public key:', cleanupError.message);
      }
    }

    console.error('Create department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create department',
      code: 'DEPARTMENT_CREATE_ERROR',
    });
  }
}