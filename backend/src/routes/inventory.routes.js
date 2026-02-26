/**
 * @file inventory.routes.js
 * @description Inventory CRUD routes
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
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
 * Middleware to handle express-validator results
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation error', details: errors.array() });
    }
    next();
};

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
router.post('/', verifyToken, isManagerOrAdmin, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Priority must be high, medium, or low'),
    body('alertThreshold').optional().isInt({ min: 0 }).withMessage('Alert threshold must be a non-negative integer')
], validate, createItem);

/**
 * @route   PUT /api/inventory/:id
 * @desc    Update inventory item
 * @access  Private (Manager/Admin)
 */
router.put('/:id', verifyToken, isManagerOrAdmin, [
    param('id').trim().notEmpty().withMessage('Item ID is required'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Priority must be high, medium, or low'),
    body('alertThreshold').optional().isInt({ min: 0 }).withMessage('Alert threshold must be a non-negative integer')
], validate, updateItem);

/**
 * @route   PATCH /api/inventory/:id/stock
 * @desc    Update stock level
 * @access  Private (Any authenticated user)
 */
router.patch('/:id/stock', verifyToken, canModifyStock, [
    param('id').trim().notEmpty().withMessage('Item ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('action').isIn(['add', 'subtract']).withMessage('Action must be "add" or "subtract"')
], validate, updateStock);

/**
 * @route   DELETE /api/inventory/:id
 * @desc    Delete inventory item
 * @access  Private (Manager/Admin)
 */
router.delete('/:id', verifyToken, isManagerOrAdmin, deleteItem);

module.exports = router;
