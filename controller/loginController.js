import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User  from '../models/User.js'; // In-memory user store (replace with DB in production)

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
    
}


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
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });    

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this username or email already exists'
            });
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const newUser = {
            id: crypto.randomUUID(), // Simple ID generation (use UUID in production)
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        User.create(newUser);

        // Generate token
        const token = generateToken(newUser.id, newUser.username);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: newUser.id,
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

export { loginFunction, registerFunction, logoutFunction };