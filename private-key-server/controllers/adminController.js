import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Permission from '../models/Permission.js';
import PrivateKey from '../models/PrivateKey.js';
import mongoose from 'mongoose';

/**
 * Register admin account
 * POST /admin/registration
 * Body: { username, email, password, firstName, lastName, phone, organizationId }
 */
export const registerAdmin = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      organizationId
    } = req.body;

    // Validation
    const errors = [];

    if (!username || username.trim().length < 3) {
      errors.push('Username is required and must be at least 3 characters');
    }
    if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      errors.push('Valid email is required');
    }
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!firstName || firstName.trim().length < 2) {
      errors.push('First name is required and must be at least 2 characters');
    }
    if (!lastName || lastName.trim().length < 2) {
      errors.push('Last name is required and must be at least 2 characters');
    }
    if (!phone || !/^[\+]?[1-9][\d]{0,15}$/.test(phone)) {
      errors.push('Valid phone number is required');
    }
    if (!organizationId) {
      errors.push('Organization ID is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: email.toLowerCase().trim() }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this username or email already exists',
        errors: ['Username or email already in use']
      });
    }

    // Verify organization exists (check if any user with this organizationId exists)
    // Since we don't have Organization model in private-key-server, we'll check via users
    const orgUser = await User.findOne({ organization: organizationId });
    let organizationName = 'Unknown Organization';
    
    if (orgUser && orgUser.organizationName) {
      organizationName = orgUser.organizationName;
    }

    // Check if organization already has an admin
    const existingAdmin = await User.findOne({
      organization: organizationId,
      role: 'Admin'
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Organization already has an admin account',
        errors: ['Admin account already exists for this organization']
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const adminUser = new User({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      role: 'Admin',
      organization: organizationId,
      organizationName: organizationName,
      isActive: true,
      jobTitle: 'Administrator', // Default job title for admin
      department: 'Administration' // Default department for admin
    });

    await adminUser.save();

    // Return admin data (without password)
    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        id: adminUser._id,
        username: adminUser.username,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
        organizationId: adminUser.organization,
        organizationName: adminUser.organizationName,
        createdAt: adminUser.createdAt
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin account',
      errors: [error.message]
    });
  }
};

/**
 * Search for employees/users
 * GET /admin/search-employees
 * Query params: search (username, email, firstName, lastName)
 */
export const searchEmployees = async (req, res) => {
  try {
    const { search, department, organizationId } = req.query;
    const currentUser = req.user;

    // Only admins can search employees
    if (currentUser.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can search employees',
        code: 'FORBIDDEN'
      });
    }

    // Build search query
    const searchQuery = {};

    // Filter by organization if provided
    if (organizationId) {
      searchQuery.organization = organizationId;
    } else {
      // If no organizationId provided, use current user's organization
      if (currentUser.organizationId) {
        searchQuery.organization = currentUser.organizationId;
      }
    }

    // Filter by department if provided
    if (department) {
      searchQuery.department = { $regex: department, $options: 'i' };
    }

    // Search by username, email, firstName, or lastName
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      searchQuery.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ];
    }

    // Exclude the current admin from results
    searchQuery._id = { $ne: currentUser.id };

    // Find users matching the search criteria
    const employees = await User.find(searchQuery)
      .select('username email firstName lastName role department jobTitle organization organizationName isActive createdAt')
      .populate('organization', 'name displayName')
      .limit(50) // Limit results to 50
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        employees: employees.map(emp => ({
          id: emp._id,
          username: emp.username,
          email: emp.email,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role,
          department: emp.department,
          jobTitle: emp.jobTitle,
          organizationId: emp.organization?._id || emp.organization,
          organizationName: emp.organizationName,
          isActive: emp.isActive,
          createdAt: emp.createdAt
        })),
        count: employees.length
      }
    });

  } catch (error) {
    console.error('Search employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search employees',
      code: 'SEARCH_ERROR',
      error: error.message
    });
  }
};

/**
 * Add employee to permission list for a department
 * POST /admin/add-to-permission
 * Body: { departmentName, userId (or username, or userEmail) }
 */
export const addEmployeeToPermission = async (req, res) => {
  try {
    const { departmentName, userId, username, userEmail } = req.body;
    const currentUser = req.user;
    const addedBy = currentUser.id;

    // Only admins can add employees to permission list
    if (currentUser.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add employees to permission list',
        code: 'FORBIDDEN'
      });
    }

    // Validation
    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
        code: 'MISSING_DEPARTMENT'
      });
    }

    if (!userId && !username && !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'At least one of userId, username, or userEmail is required',
        code: 'MISSING_USER_IDENTIFIER'
      });
    }

    // Check if private key exists for this department
    const privateKey = await PrivateKey.findOne({
      departmentName: departmentName.toLowerCase().trim()
    });

    if (!privateKey) {
      return res.status(404).json({
        success: false,
        message: 'Private key does not exist for this department',
        code: 'KEY_NOT_FOUND'
      });
    }

    // Verify user exists
    let userToAdd = null;
    if (userId) {
      userToAdd = await User.findById(userId);
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
    } else if (userEmail) {
      userToAdd = await User.findOne({ email: userEmail.toLowerCase().trim() });
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email',
          code: 'USER_NOT_FOUND'
        });
      }
    } else if (username) {
      userToAdd = await User.findOne({ username: username.toLowerCase().trim() });
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this username',
          code: 'USER_NOT_FOUND'
        });
      }
    }

    // Verify user belongs to the same organization as admin (optional check)
    if (currentUser.organizationId && userToAdd.organization) {
      if (currentUser.organizationId.toString() !== userToAdd.organization.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Cannot add employee from different organization',
          code: 'ORGANIZATION_MISMATCH'
        });
      }
    }

    // Find or create permission document
    let permission = await Permission.findOne({
      departmentName: departmentName.toLowerCase().trim()
    });

    if (!permission) {
      permission = new Permission({
        departmentName: departmentName.toLowerCase().trim(),
        allowedUsers: []
      });
    }

    // Prepare user data to add
    const userData = {
      userId: userToAdd._id,
      username: userToAdd.username,
      userEmail: userToAdd.email,
      addedAt: new Date(),
      addedBy: addedBy
    };

    // Check if user is already in the permission list
    const existingUser = permission.allowedUsers.find(allowedUser => {
      if (userData.userId && allowedUser.userId) {
        return allowedUser.userId.toString() === userData.userId.toString();
      }
      if (userData.username && allowedUser.username) {
        return allowedUser.username.toLowerCase() === userData.username.toLowerCase();
      }
      if (userData.userEmail && allowedUser.userEmail) {
        return allowedUser.userEmail.toLowerCase() === userData.userEmail.toLowerCase();
      }
      return false;
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User is already in the permission list',
        code: 'USER_ALREADY_EXISTS'
      });
    }

    // Add user to permission list
    permission.allowedUsers.push(userData);
    await permission.save();

    res.status(201).json({
      success: true,
      message: 'Employee added to permission list successfully',
      data: {
        departmentName: permission.departmentName,
        employee: {
          id: userToAdd._id,
          username: userToAdd.username,
          email: userToAdd.email,
          firstName: userToAdd.firstName,
          lastName: userToAdd.lastName,
          role: userToAdd.role,
          department: userToAdd.department
        },
        addedAt: userData.addedAt,
        totalUsers: permission.allowedUsers.length
      }
    });

  } catch (error) {
    console.error('Add employee to permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add employee to permission list',
      code: 'ADD_ERROR',
      error: error.message
    });
  }
};

