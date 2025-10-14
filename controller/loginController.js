import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User  from '../models/User.js';

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
    try {
        // Extract token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token using JWT_SECRET from .env
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }

            // Add user info to request object
            req.user = {
                userId: decoded.userId,
                username: decoded.username
            };

            next();
        });

    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

async function loginFunction(req, res) {
    try {
        // Accept either 'identity' (new) or 'username' (backward compatibility)
        const identity = req.body.identity || req.body.username;
        const { password } = req.body;

        // Validate required fields
        if (!identity || !password) {
            return res.status(400).json({
                success: false,
                message: 'Identity and password are required'
            });
        }

        // Allow login by username or email (case-insensitive)
        // The identity field can contain either username or email
        const user = await User.findOne({
            $or: [
                { username: identity.toLowerCase() }, 
                { email: identity.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = generateToken(user._id, user.username);

        // Return response with token at root level (for frontend compatibility)
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,  // Token at root level
            username: user.username,  // Username at root level
            data: {
                userId: user._id,
                username: user.username,
                email: user.email,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};



async function registerFunction(req, res) {
    // Implement registration logic here
    try {
        const { username, password, email } = req.body;

        // Basic validation
        if (!username || !password || !email) {
            return res.status(400).json({
                success: false,
                message: 'Username, password, and email are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { username: username.toLowerCase() }, 
                { email: email.toLowerCase() }
            ] 
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this username or email already exists'
            });
        }

        //Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        
        const newUser = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date()
        });

        // Generate token using MongoDB's _id
        const token = generateToken(newUser._id, newUser.username);

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
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }

}

async function logoutFunction(req, res) {
    // Implement logout logic here
    
}

export { loginFunction, registerFunction, logoutFunction, authenticateToken };