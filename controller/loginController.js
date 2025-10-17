import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User  from '../models/User.js';
import { validateRegistrationData,validateLoginCredentials } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { generateTokens } from '../middleware/auth.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'SUPERSECRETKEY-CHANGE-IN-PRODUCTION-PLEASE-AND-KEEP-SECRET';

//Function to generate JWT
const generateToken = (userId,username) =>{
    return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '1h' });
};

//Paswsword hashing
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};


//Password verification
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

//Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.sendStatus(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403).json({
            success: false,
            message: 'Invalid token or expired'
        });
   
        req.user = user;
        next();
    });
}


// User Authentication Endpoints
/**
 * @route POST /auth/login
 * @desc User login with database validation
 * @access Public
 */

async function loginFunction(req, res) {
    // Implement login logic here
    try {
        // Handle both query parameters and JSON body
        const { username, password } = {
          username: req.body.username || req.query.username,
          password: req.body.password || req.query.password
        };
        
        // Validate input
        const validation = validateLoginCredentials({ username, password });
        if (!validation.isValid) {
          logger.warn('Login validation failed', { username, errors: validation.errors });
          return res.status(400).json({
            success: false,
            message: 'Invalid input',
            errors: validation.errors
          });
        }
    
        const { username: sanitizedUsername, password: sanitizedPassword } = validation.sanitized;
        
        logger.auth('attempt', sanitizedUsername);
    
        // Find user in database
        const user = await User.findOne({
          $or: [
            { username: sanitizedUsername }, 
            { email: sanitizedUsername }
          ],
        });
    
        if (!user) {
          logger.auth('failed', sanitizedUsername, { reason: 'user_not_found' });
          return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
          });
        }
    
        // Verify password
        const bcrypt = await import('bcryptjs');
        const isPasswordValid = await bcrypt.compare(sanitizedPassword, user.password);
        
        if (!isPasswordValid) {
          logger.auth('failed', sanitizedUsername, { reason: 'invalid_password' });
          return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
          });
        }
    
        // Update last login
        user.lastLogin = new Date();
        await user.save();
    
        logger.auth('success', user.username);
    
        res.json({
          success: true,
          message: 'Login successful',
          data: {
            organizationName: user.organizationName,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            userId: user._id,
            loginTime: user.lastLogin
          }
        });
    
      } catch (error) {
        logger.error('Login error', { error: error.message, stack: error.stack });
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
    }
}



async function registerFunction(req, res) {
    // Implement comprehensive registration logic here
    try {
        const {
            // Basic Authentication
            username,
            password,
            confirmPassword,
            email,
            
            // Personal Information
            firstName,
            lastName,
            phone,
            jobTitle,
            department,
            
            // Role and Organization
            role,
            organizationName,
            
            // Contact Preferences
            emailNotifications,
            smsNotifications,
            marketingEmails,
            
            // Optional fields
            bio,
            timezone,
            language
        } = req.body;

        // Comprehensive validation
        const errors = [];
        
        // Basic validation
        if (!username || username.trim().length < 3) {
            errors.push('Username is required and must be at least 3 characters');
        }
        if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            errors.push('Valid email is required');
        }
        if (!password || password.length < 8) {
            errors.push('Password must be at least 8 characters');
        }
        if (password !== confirmPassword) {
            errors.push('Password confirmation does not match');
        }
        
        // Personal information validation
        if (!firstName || firstName.trim().length < 2) {
            errors.push('First name is required and must be at least 2 characters');
        }
        if (!lastName || lastName.trim().length < 2) {
            errors.push('Last name is required and must be at least 2 characters');
        }
        if (!phone || !/^[\+]?[1-9][\d]{0,15}$/.test(phone)) {
            errors.push('Valid phone number is required');
        }
        if (!jobTitle || jobTitle.trim().length < 2) {
            errors.push('Job title is required and must be at least 2 characters');
        }
        if (!department || department.trim().length < 2) {
            errors.push('Department is required and must be at least 2 characters');
        }
        
        // Role validation
        if (!role || !['Admin', 'Manager', 'Employee', 'Guest'].includes(role)) {
            errors.push('Valid role is required (Admin, Manager, Employee, Guest)');
        }
        
        // Organization validation
        if (!organizationName || organizationName.trim().length === 0) {
            errors.push('Organization name is required for registration');
        }
        
        if (errors.length > 0) {
            logger.warn('Registration validation failed', { username, email, errors });
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username: username.toLowerCase().trim() }, { email: email.toLowerCase().trim() }] 
        });    

        if (existingUser) {
            logger.warn('Registration failed - user already exists', { username, email });
            return res.status(409).json({
                success: false,
                message: 'User with this username or email already exists'
            });
        }

        // Find organization (must exist)
        const { findOrganization } = await import('../db.js');
        const organization = await findOrganization(organizationName.trim());
        
        if (!organization) {
            logger.warn('Registration failed - organization not found', { organizationName, username });
            return res.status(400).json({
                success: false,
                message: `Organization '${organizationName}' does not exist. Please contact your administrator to create this organization first.`
            });
        }

        // Set default permissions based on role
        let defaultPermissions = [];
        switch (role) {
            case 'Admin':
                defaultPermissions = ['read', 'write', 'delete', 'admin', 'manage_users', 'manage_organization'];
                break;
            case 'Manager':
                defaultPermissions = ['read', 'write', 'manage_users'];
                break;
            case 'Employee':
                defaultPermissions = ['read', 'write'];
                break;
            case 'Guest':
                defaultPermissions = ['read'];
                break;
        }

        // Hash password and create comprehensive user
        const hashedPassword = await hashPassword(password);
        const newUser = new User({
            // Basic Authentication
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            
            // Personal Information
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            jobTitle: jobTitle.trim(),
            department: department.trim(),
            
            // Role and Permissions
            role: role,
            permissions: defaultPermissions,
            isActive: true,
            
            // Organization Association
            organization: organization._id,
            organizationName: organizationName.trim(),
            
            // Contact Preferences
            contactPreferences: {
                emailNotifications: emailNotifications !== false,
                smsNotifications: smsNotifications === true,
                marketingEmails: marketingEmails === true
            },
            
            // Optional Profile Information
            bio: bio ? bio.trim() : '',
            timezone: timezone || 'UTC',
            language: language || 'en',
            
            // Security
            lastPasswordChange: new Date()
        });

        await newUser.save();

        // Generate tokens
        const tokens = generateTokens(newUser);

        logger.info('User registered successfully', { 
            username: newUser.username, 
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            organizationName: newUser.organizationName
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: newUser._id,
                username: newUser.username,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
                organizationName: newUser.organizationName,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: '24h'
            }
        });

    } catch (error) {
        logger.error('Registration error', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }

}

async function logoutFunction(req, res) {
    // Logout logic is now handled by the auth middleware
    // This function is kept for backward compatibility
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
}

export { loginFunction, registerFunction, logoutFunction };