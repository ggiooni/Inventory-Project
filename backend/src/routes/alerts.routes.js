/**
 * @file alerts.routes.js
 * @description Alert system routes
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const express = require('express');
const router = express.Router();
const { getAlerts, getShoppingList, exportAlerts } = require('../controllers/alerts.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   GET /api/alerts
 * @desc    Get all active alerts
 * @access  Private
 */
router.get('/', verifyToken, getAlerts);

/**
 * @route   GET /api/alerts/shopping-list
 * @desc    Generate shopping list from alerts
 * @access  Private
 */
router.get('/shopping-list', verifyToken, getShoppingList);

/**
 * @route   GET /api/alerts/export
 * @desc    Export alerts as CSV
 * @access  Private
 */
router.get('/export', verifyToken, exportAlerts);

module.exports = router;
