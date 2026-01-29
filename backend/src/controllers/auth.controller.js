/**
 * @file auth.controller.js
 * @description Authentication controller
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');
const { USER_ROLES, JWT_CONFIG, MESSAGES } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

// Demo users (for development/testing)
const DEMO_USERS = {
    'admin@inventory.com': { password: 'admin123.', role: USER_ROLES.ADMIN },
    'manager@inventory.com': { password: 'manager123.', role: USER_ROLES.MANAGER },
    'staff@inventory.com': { password: 'staff123.', role: USER_ROLES.STAFF }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    // Check demo users first (for development)
    const demoUser = DEMO_USERS[email.toLowerCase()];
    if (demoUser && password === demoUser.password) {
        const token = generateToken(email, demoUser.role);

        return res.json({
            success: true,
            message: MESSAGES.SUCCESS.LOGIN,
            data: {
                token,
                user: {
                    email,
                    role: demoUser.role,
                    displayName: email.split('@')[0]
                }
            }
        });
    }

    // Check Firebase/database users (for production)
    if (db) {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email.toLowerCase()).get();

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();

            const isValidPassword = await bcrypt.compare(password, userData.password);
            if (isValidPassword) {
                const token = generateToken(email, userData.role);

                return res.json({
                    success: true,
                    message: MESSAGES.SUCCESS.LOGIN,
                    data: {
                        token,
                        user: {
                            id: userDoc.id,
                            email: userData.email,
                            role: userData.role,
                            displayName: userData.displayName || email.split('@')[0]
                        }
                    }
                });
            }
        }
    }

    throw new ApiError(401, 'Invalid email or password');
});

/**
 * Register new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
    const { email, password, displayName, role = USER_ROLES.STAFF } = req.body;

    // Validate input
    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    if (password.length < 6) {
        throw new ApiError(400, 'Password must be at least 6 characters');
    }

    // Check if Firebase is available
    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    // Check if user already exists
    const usersRef = db.collection('users');
    const existingUser = await usersRef.where('email', '==', email.toLowerCase()).get();

    if (!existingUser.empty) {
        throw new ApiError(400, 'Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: displayName || email.split('@')[0],
        role: role,
        createdAt: new Date().toISOString()
    };

    const docRef = await usersRef.add(newUser);

    // Generate token
    const token = generateToken(email, role);

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            token,
            user: {
                id: docRef.id,
                email: newUser.email,
                role: newUser.role,
                displayName: newUser.displayName
            }
        }
    });
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = asyncHandler(async (req, res) => {
    const { email, role } = req.user;

    res.json({
        success: true,
        data: {
            email,
            role,
            displayName: email.split('@')[0]
        }
    });
});

/**
 * Logout (optional - mainly for token blacklisting)
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
    // In a more complex system, you would blacklist the token here
    res.json({
        success: true,
        message: MESSAGES.SUCCESS.LOGOUT
    });
});

/**
 * Generate JWT token
 */
function generateToken(email, role) {
    return jwt.sign(
        { email, role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: JWT_CONFIG.EXPIRES_IN }
    );
}

module.exports = {
    login,
    register,
    getProfile,
    logout
};
