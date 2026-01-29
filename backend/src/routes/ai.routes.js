/**
 * @file ai.routes.js
 * @description AI Assistant routes
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const express = require('express');
const router = express.Router();
const { chat, getPredictions, generateShoppingList, getInsights } = require('../controllers/ai.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with AI assistant
 * @access  Private
 */
router.post('/chat', verifyToken, chat);

/**
 * @route   POST /api/ai/predictions
 * @desc    Get AI predictions for inventory
 * @access  Private
 */
router.post('/predictions', verifyToken, getPredictions);

/**
 * @route   POST /api/ai/shopping-list
 * @desc    Generate AI-powered shopping list
 * @access  Private
 */
router.post('/shopping-list', verifyToken, generateShoppingList);

/**
 * @route   POST /api/ai/insights
 * @desc    Get AI insights about inventory
 * @access  Private
 */
router.post('/insights', verifyToken, getInsights);

module.exports = router;
