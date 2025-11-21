import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User  from '../models/User.js';
import Department from '../models/Department.js';
import LocalServer from '../models/LocalServer.js';
import { generateTokens } from '../middleware/auth.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'SUPERSECRETKEY-CHANGE-IN-PRODUCTION-PLEASE-AND-KEEP-SECRET';

// //Function to generate JWT
// const generateToken = (userId,username) =>{
//     return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '1h' });
// };

//Paswsord hashing
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};


//Password verification
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// //Middleware to verify JWT
// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];
//     if (!token) {
//         return res.sendStatus(401).json({
//             success: false,
//             message: 'No token provided'
//         });
//     }
//     jwt.verify(token, JWT_SECRET, (err, user) => {
//         if (err) return res.sendStatus(403).json({
//             success: false,
//             message: 'Invalid token or expired'
//         });
   
//         req.user = user;
//         next();
//     });
// }

async function loginFunction(req, res) {
    // Implement login logic here
     try {
    const { username, password } = req.body;

    console.log(username, password);

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

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);
    console.log('Login successful for user:', user.username, tokens.accessToken);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationName: user.organizationName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: '24h',
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
    // Implement comprehensive registration logic here
    try {
        console.log('Registration request body:', JSON.stringify(req.body, null, 2));
        
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
            console.log('Validation errors:', errors);
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
            return res.status(409).json({
                success: false,
                message: 'User with this username or email already exists'
            });
        }

        // Find organization (must exist)
        const { findOrganization } = await import('../db.js');
        const organization = await findOrganization(organizationName.trim());
        
        if (!organization) {
            return res.status(400).json({
                success: false,
                message: `Organization '${organizationName}' does not exist. Please contact your administrator to create this organization first.`
            });
        }

        const normalizedDepartment = department.trim().toLowerCase();
        const departmentRecord = await Department.findOne({
            organization: organization._id,
            departmentName: normalizedDepartment,
        });

        if (!departmentRecord) {
            return res.status(404).json({
                success: false,
                message: `Department '${department}' is not available for organization '${organizationName}'.`,
            });
        }

        const activeLocalServer = await LocalServer.findOne({
            organization: organization._id,
            isActive: true,
        });

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
            department: departmentRecord.departmentName,
            
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

        newUser.localAccount = activeLocalServer
            ? {
                status: 'pending',
                serverUrl: activeLocalServer.baseUrl,
            }
            : {
                status: 'not_required',
            };

        await newUser.save();

        // Create blockchain identity for the user if organization has blockchain
        if (organization.hasBlockchain && organization.blockchainOrgName) {
            try {
                const blockChainFunctionHandler = (await import('../blockchain/controllers/blockChainFunctionHandler.js')).default;
                const blockchainController = new blockChainFunctionHandler();
                
                console.log(`Creating blockchain identity for user: ${username} in blockchain organization: ${organization.blockchainOrgName}`);
                await blockchainController.createUserIdentity(
                    username.toLowerCase().trim(),
                    organization.blockchainOrgName.toLowerCase().trim(),
                    password  // Using the user's password for blockchain identity
                );
                console.log(`Blockchain identity created successfully for user: ${username}`);
            } catch (blockchainError) {
                // Log the error but don't fail registration
                // The user account is created, blockchain identity can be created later
                console.error('Failed to create blockchain identity:', blockchainError.message);
                console.error('User account created but blockchain identity creation failed');
                // Optionally, you could update user record with a flag indicating blockchain identity creation failed
            }
        } else {
            console.log(`Organization ${organizationName} does not have blockchain enabled or blockchainOrgName not set. Skipping blockchain identity creation.`);
        }

        // Generate tokens
        const tokens = generateTokens(newUser);
        const localServerPayload = activeLocalServer
            ? {
                baseUrl: activeLocalServer.baseUrl,
                organizationName: organization.name,
                departmentName: departmentRecord.displayName,
                normalizedDepartmentName: departmentRecord.departmentName,
            }
            : null;
        console.log('Registration successful for user:', newUser.username, tokens.accessToken);
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
                departmentName: departmentRecord.displayName,
                localServer: localServerPayload,
                localAccountStatus: newUser.localAccount?.status,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: '24h'
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }

}

async function confirmLocalAccount(req, res) {
    try {
        const { status, serverUrl, externalUserId, error } = req.body || {};

        if (!status || !['success', 'failed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either success or failed',
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!user.localAccount || user.localAccount.status === 'not_required') {
            return res.status(400).json({
                success: false,
                message: 'Local account synchronization is not required for this user',
            });
        }

        if (status === 'success') {
            user.localAccount.status = 'synced';
            user.localAccount.serverUrl = serverUrl || user.localAccount.serverUrl;
            user.localAccount.externalUserId = externalUserId || user.localAccount.externalUserId;
            user.localAccount.lastSyncedAt = new Date();
            user.localAccount.lastError = null;
            await user.save();

            return res.json({
                success: true,
                message: 'Local private-key-server account synchronized successfully',
                data: {
                    localAccountStatus: user.localAccount.status,
                },
            });
        }

        const userId = user._id;
        await User.deleteOne({ _id: userId });

        return res.status(409).json({
            success: false,
            message: 'Local private-key-server provisioning failed. The main account has been removed. Please register again.',
            data: {
                removed: true,
                reason: error || 'Local server rejected account creation',
            },
        });
    } catch (err) {
        console.error('confirmLocalAccount error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update local account status',
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


async function adminRegisterFunction(req, res) {
    // Implement admin registration logic here
    try {
        const {username, password, email, firstName, lastName, phone, organizationId, jobTitle, department} = req.body;

        // Validation
        if (!username || !password || !email || !firstName || !lastName || !phone || !organizationId) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Convert phone to string if it's a number
        const phoneStr = typeof phone === 'string' ? phone : String(phone);

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username: username.toLowerCase().trim() }, { email: email.toLowerCase().trim() }] 
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this username or email already exists'
            });
        }

        // Find organization by ID directly using mongoose
        const { Organization } = await import('../db.js');
        const organization = await Organization.findById(organizationId);
        
        if (!organization) {
            return res.status(400).json({
                success: false,
                message: `Organization with ID '${organizationId}' does not exist.`
            });
        }

        // Check if organization already has an admin using organizationId
        const existingAdmin = await User.findOne({
            organization: organizationId,
            role: 'Admin',
            isActive: true
        });

        if (existingAdmin) {
            return res.status(409).json({
                success: false,
                message: `Organization '${organization.name}' already has an admin. Only one admin is allowed per organization.`,
                data: {
                    existingAdmin: {
                        username: existingAdmin.username,
                        email: existingAdmin.email,
                        firstName: existingAdmin.firstName,
                        lastName: existingAdmin.lastName
                    }
                }
            });
        }

        const hashedPassword = await hashPassword(password);
        const newUser = new User({
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phoneStr.trim(),
            jobTitle: jobTitle ? jobTitle.trim() : 'Administrator',
            department: department ? department.trim() : 'Blockchain',
            role: 'Admin',
            permissions: ['read', 'write', 'delete', 'admin', 'manage_users', 'manage_organization'],
            isActive: true,
            organization: organizationId,
            organizationName: organization.name,
            lastPasswordChange: new Date()
        });

        await newUser.save();

        // Generate tokens
        const tokens = generateTokens(newUser);

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
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
        console.error('Admin registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
export { loginFunction, registerFunction, logoutFunction, adminRegisterFunction, confirmLocalAccount };