// Organization Management Endpoints
/**
 * @route POST /org/validate-organization
 * @desc Validate and create new organization
 * @access Public
 */

import {logger} from '../utils/logger.js';
import { createOrganization, findOrganization } from '../models/organization.js';
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
        logger.warn('Organization validation failed', { errors });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
        }
        
        logger.info('Organization registration request', { 
        name: name.toLowerCase(), 
        email,
        businessType,
        industry 
        });

        // Check if organization already exists (by name or email)
        const { Organization } = await import('./db.js');
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
        logger.info('Organization created successfully', { 
            organizationName: organizationData.name,
            organizationId: result.organization._id,
            email: organizationData.email
        });
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
        logger.error('Failed to create organization', { 
            organizationName: organizationData.name, 
            error: result.message 
        });
        res.status(500).json({
            success: false,
            message: result.message || 'Failed to create organization'
        });
        }

    } catch (error) {
        logger.error('Organization registration error', { error: error.message, stack: error.stack });
        res.status(500).json({
        success: false,
        message: 'Internal server error'
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
        
        console.log(`SignIn organization validation: ${sanitizedOrgName}`);
    
        // Check if organization exists
        const organization = await findOrganization(sanitizedOrgName);
        
        if (!organization) {
          return res.status(404).json({
            success: false,
            message: 'Organization not found. Please check the organization name and try again.'
          });
        }
    
        console.log(`Organization found: ${organization.displayName}`);
        
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
        console.error('SignIn organization validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
}