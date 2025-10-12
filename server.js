/**
 * Production-Ready Express Server
 * Main server file for the Safe Frontend-Backend application
 */

// Core imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Application imports
import { connectDB, disconnectDB, createOrganization, findOrganization } from './db.js';
import User from './models/User.js';
import loginRouter from './router/loginRouter.js';
import router from './router/fileRouter.js';
import keyRouter from './router/keyRouter.js';
import { 
  authenticateToken, 
  optionalAuth, 
  requireRole, 
  requirePermission,
  refreshToken,
  logout,
  getCurrentUser
} from './middleware/auth.js';

// Utilities
import { logger } from './utils/logger.js';
import { validateLoginCredentials, validateOrganizationName } from './utils/validation.js';
import { serverConfig, securityConfig, rateLimitConfig, appConfig } from './config/index.js';

// Load environment variables
dotenv.config();
    
// Initialize Express app
const app = express();

// File path configuration
const __filepath = fileURLToPath(import.meta.url);
const __dirpath = path.dirname(__filepath);

// Rate limiting
const limiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  message: rateLimitConfig.message,
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || securityConfig.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.http(req, res, responseTime);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: serverConfig.nodeEnv,
    version: appConfig.version,
    uptime: process.uptime()
  });
});

// API routes
app.use('/api', router);
app.use('/auth', loginRouter);
app.use('/api/keys', keyRouter);

// Static file serving (after API routes to avoid conflicts)
app.use(express.static(path.join(__dirpath, 'public')));

// Authentication routes
app.post('/auth/refresh', refreshToken);
app.post('/auth/logout', authenticateToken, logout);
app.get('/auth/me', authenticateToken, getCurrentUser);

// User Authentication Endpoints
/**
 * @route POST /login
 * @desc User login with database validation
 * @access Public
 */
app.post('/login', async (req, res) => {
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
});

// Organization Management Endpoints
/**
 * @route POST /validate-organization
 * @desc Validate and create new organization
 * @access Public
 */
app.post('/validate-organization', async (req, res) => {
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
});

/**
 * @route POST /validate-signin-organization
 * @desc Validate existing organization for sign-in
 * @access Public
 */
app.post('/validate-signin-organization', async (req, res) => {
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
});

// Debug endpoint (only in development)
if (serverConfig.nodeEnv === 'development') {
  app.get('/debug/users', async (req, res) => {
    try {
      const users = await User.find({}).select('username email createdAt lastLogin organization organizationName').populate('organization', 'name displayName');
      res.json({
        success: true,
        count: users.length,
        users: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.get('/debug/organizations', async (req, res) => {
    try {
      const { Organization } = await import('./db.js');
      const organizations = await Organization.find({}).select('name displayName createdAt isActive');
      res.json({
        success: true,
        count: organizations.length,
        organizations: organizations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.get('/debug/all', async (req, res) => {
    try {
      const { Organization } = await import('./db.js');
      const users = await User.find({}).select('username email createdAt lastLogin organization organizationName').populate('organization', 'name displayName');
      const organizations = await Organization.find({}).select('name displayName createdAt isActive');
      
      // Count users per organization
      const orgUserCount = {};
      users.forEach(user => {
        const orgName = user.organizationName || 'No Organization';
        orgUserCount[orgName] = (orgUserCount[orgName] || 0) + 1;
      });
      
      res.json({
        success: true,
        summary: {
          totalUsers: users.length,
          totalOrganizations: organizations.length,
          usersPerOrganization: orgUserCount
        },
        users: users,
        organizations: organizations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

// Protected routes - require authentication
/**
 * @route GET /api/protected
 * @desc Protected route example
 * @access Private
 */
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to protected resource',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      organizationName: req.user.organizationName
    }
  });
});

/**
 * @route GET /api/admin
 * @desc Admin only route
 * @access Private (Admin only)
 */
app.get('/api/admin', authenticateToken, requireRole(['Admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Admin access granted',
    user: req.user
  });
});

/**
 * @route GET /api/user-management
 * @desc User management route (requires specific permissions)
 * @access Private (requires manage_users permission)
 */
app.get('/api/user-management', authenticateToken, requirePermission(['manage_users']), (req, res) => {
  res.json({
    success: true,
    message: 'User management access granted',
    user: req.user
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const message = serverConfig.nodeEnv === 'production' 
    ? 'Something went wrong' 
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    message: message
  });
});

// Connect to database
connectDB();

// Start server
const server = app.listen(serverConfig.port, () => {
  logger.info(`🚀 Server started successfully!`, {
    port: serverConfig.port,
    environment: serverConfig.nodeEnv,
    version: appConfig.version
  });
  
  console.log(`🚀 Server started successfully!`);
  console.log(`📍 Environment: ${serverConfig.nodeEnv}`);
  console.log(`🌐 Server URL: http://localhost:${serverConfig.port}`);
  console.log(`🔐 Login endpoint: http://localhost:${serverConfig.port}/login`);
  console.log(`📝 Register endpoint: http://localhost:${serverConfig.port}/auth/register`);
  console.log(`🏢 Organization validation: http://localhost:${serverConfig.port}/validate-organization`);
  console.log(`🔍 SignIn organization validation: http://localhost:${serverConfig.port}/validate-signin-organization`);
  console.log(`💚 Health check: http://localhost:${serverConfig.port}/health`);
  console.log(`🎨 Frontend: ${securityConfig.corsOrigins.join(', ')}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Graceful shutdown initiated`, { signal });
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    console.log('✅ HTTP server closed');
    
    try {
      await disconnectDB();
      logger.info('Database disconnected');
      console.log('✅ Database disconnected');
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
