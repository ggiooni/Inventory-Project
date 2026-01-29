/**
 * @file inventory.routes.js
 * @description Inventory CRUD routes
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const express = require('express');
const router = express.Router();
const {
    getAllItems,
    getItemById,
    createItem,
    updateItem,
    updateStock,
    deleteItem,
    getStats
} = require('../controllers/inventory.controller');
const { verifyToken, isManagerOrAdmin, canModifyStock } = require('../middleware/auth');

/**
 * @route   GET /api/inventory
 * @desc    Get all inventory items
 * @access  Private
 */
router.get('/', verifyToken, getAllItems);

/**
 * @route   GET /api/inventory/stats
 * @desc    Get inventory statistics
 * @access  Private
 */
router.get('/stats', verifyToken, getStats);

/**
 * @route   GET /api/inventory/:id
 * @desc    Get single inventory item
 * @access  Private
 */
router.get('/:id', verifyToken, getItemById);

/**
 * @route   POST /api/inventory
 * @desc    Create new inventory item
 * @access  Private (Manager/Admin)
 */
router.post('/', verifyToken, isManagerOrAdmin, createItem);

/**
 * @route   PUT /api/inventory/:id
 * @desc    Update inventory item
 * @access  Private (Manager/Admin)
 */
router.put('/:id', verifyToken, isManagerOrAdmin, updateItem);

/**
 * @route   PATCH /api/inventory/:id/stock
 * @desc    Update stock level
 * @access  Private (Any authenticated user)
 */
router.patch('/:id/stock', verifyToken, canModifyStock, updateStock);

/**
 * @route   DELETE /api/inventory/:id
 * @desc    Delete inventory item
 * @access  Private (Manager/Admin)
 */
router.delete('/:id', verifyToken, isManagerOrAdmin, deleteItem);

module.exports = router;
