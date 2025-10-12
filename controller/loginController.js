import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User  from '../models/User.js'; // In-memory user store (replace with DB in production)
import { validateRegistrationData } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

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

async function loginFunction(req, res) {
    // Implement login logic here
     try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // Allow login by username or email (case-insensitive)
    const user = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.username);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        token,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};



async function registerFunction(req, res) {
    // Implement registration logic here
    try {
        const { username, password, email, organizationName } = req.body;

        // Validate input using comprehensive validation
        const validation = validateRegistrationData({ username, password, email });
        if (!validation.isValid) {
            logger.warn('Registration validation failed', { username, email, errors: validation.errors });
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: validation.errors
            });
        }

        // Validate organization name is provided
        if (!organizationName || typeof organizationName !== 'string' || organizationName.trim().length === 0) {
            logger.warn('Registration failed - organization name required', { username });
            return res.status(400).json({
                success: false,
                message: 'Organization name is required for registration'
            });
        }

        const { username: sanitizedUsername, password: sanitizedPassword, email: sanitizedEmail } = validation.sanitized;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username: sanitizedUsername }, { email: sanitizedEmail }] 
        });    

        if (existingUser) {
            logger.warn('Registration failed - user already exists', { username: sanitizedUsername, email: sanitizedEmail });
            return res.status(409).json({
                success: false,
                message: 'User with this username or email already exists'
            });
        }

        // Find organization (must exist - no auto-creation)
        const { findOrganization } = await import('../db.js');
        const organization = await findOrganization(organizationName.trim());
        
        if (!organization) {
            logger.warn('Registration failed - organization not found', { organizationName, username });
            return res.status(400).json({
                success: false,
                message: `Organization '${organizationName}' does not exist. Please contact your administrator to create this organization first.`
            });
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(sanitizedPassword);
        const newUser = new User({
            username: sanitizedUsername,
            email: sanitizedEmail,
            password: hashedPassword,
            organization: organization ? organization._id : null,
            organizationName: organizationName || null
        });

        await newUser.save();

        // Generate token
        const token = generateToken(newUser._id, newUser.username);

        logger.info('User registered successfully', { username: newUser.username, email: newUser.email });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: newUser._id,
                username: newUser.username,
                email: newUser.email,
                token
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
    // Implement logout logic here
    // For JWT, logout is typically handled client-side by deleting the token.
    res.json({
        success: true,
        message: 'Logout successful (client should delete the token)'
    });
    
}

export { loginFunction, registerFunction, logoutFunction };