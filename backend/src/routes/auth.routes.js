/**
 * @file auth.routes.js
 * @description Authentication routes
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const express = require('express');
const router = express.Router();
const { login, register, getProfile, logout } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', register);

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
