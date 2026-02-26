/**
 * @file auth.routes.js
 * @description Authentication routes
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, register, getProfile, logout } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

// Rate limiting for auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // max 10 attempts per window
    message: { success: false, error: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public (rate limited)
 */
router.post('/login', authLimiter, login);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public (rate limited)
 */
router.post('/register', authLimiter, register);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', verifyToken, getProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', verifyToken, logout);

module.exports = router;
