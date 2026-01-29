/**
 * @file pos.routes.js
 * @description POS Integration routes
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const express = require('express');
const router = express.Router();
const {
    getConfig,
    saveConfig,
    disconnect,
    sync,
    getMenuItems,
    getMappings,
    saveMappings
} = require('../controllers/pos.controller');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/pos/config
 * @desc    Get POS configuration
 * @access  Private
 */
router.get('/config', verifyToken, getConfig);

/**
 * @route   POST /api/pos/config
 * @desc    Save POS configuration
 * @access  Private (Manager/Admin)
 */
router.post('/config', verifyToken, isManagerOrAdmin, saveConfig);

/**
 * @route   DELETE /api/pos/config
 * @desc    Disconnect POS
 * @access  Private (Manager/Admin)
 */
router.delete('/config', verifyToken, isManagerOrAdmin, disconnect);

/**
 * @route   POST /api/pos/sync
 * @desc    Sync with POS system
 * @access  Private
 */
router.post('/sync', verifyToken, sync);

/**
 * @route   GET /api/pos/menu-items
 * @desc    Get menu items from POS
 * @access  Private
 */
router.get('/menu-items', verifyToken, getMenuItems);

/**
 * @route   GET /api/pos/mappings
 * @desc    Get item mappings
 * @access  Private
 */
router.get('/mappings', verifyToken, getMappings);

/**
 * @route   POST /api/pos/mappings
 * @desc    Save item mappings
 * @access  Private (Manager/Admin)
 */
router.post('/mappings', verifyToken, isManagerOrAdmin, saveMappings);

module.exports = router;
