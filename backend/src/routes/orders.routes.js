/**
 * @file orders.routes.js
 * @description Order management routes for WaiterApp POS integration
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const {
    getAllOrders,
    getOrderById,
    createOrder,
    addOrderItem,
    updateOrderItem,
    deleteOrderItem,
    finalizeOrder
} = require('../controllers/orders.controller');
const { verifyToken } = require('../middleware/auth');

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

// ─── Order CRUD ──────────────────────────────────────────────────

/**
 * @route   GET /api/orders
 * @desc    Get all orders (optional ?table=X&status=open filters)
 * @access  Private
 */
router.get('/', verifyToken, getAllOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order with all its items and total
 * @access  Private
 */
router.get('/:id', verifyToken, getOrderById);

/**
 * @route   POST /api/orders
 * @desc    Create a new order for a table
 * @access  Private
 */
router.post('/', verifyToken, [
    body('table').trim().notEmpty().withMessage('Table name is required')
], validate, createOrder);

// ─── Order Items ─────────────────────────────────────────────────

/**
 * @route   POST /api/orders/:id/items
 * @desc    Add an item to the order (auto-increments qty if already exists)
 * @access  Private
 */
router.post('/:id/items', verifyToken, [
    param('id').trim().notEmpty().withMessage('Order ID is required'),
    body('menuItemId').trim().notEmpty().withMessage('Menu item ID is required'),
    body('name').trim().notEmpty().withMessage('Item name is required'),
    body('unitPrice').isFloat({ gt: 0 }).withMessage('Unit price must be greater than 0'),
    body('qty').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], validate, addOrderItem);

/**
 * @route   PUT /api/orders/:id/items/:itemId
 * @desc    Update an order item (quantity or status)
 * @access  Private
 */
router.put('/:id/items/:itemId', verifyToken, [
    param('id').trim().notEmpty().withMessage('Order ID is required'),
    param('itemId').trim().notEmpty().withMessage('Item ID is required'),
    body('qty').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('status').optional().isIn(['pending', 'served', 'cancelled']).withMessage('Status must be pending, served, or cancelled')
], validate, updateOrderItem);

/**
 * @route   DELETE /api/orders/:id/items/:itemId
 * @desc    Remove an item from the order
 * @access  Private
 */
router.delete('/:id/items/:itemId', verifyToken, [
    param('id').trim().notEmpty().withMessage('Order ID is required'),
    param('itemId').trim().notEmpty().withMessage('Item ID is required')
], validate, deleteOrderItem);

// ─── Order Finalization ──────────────────────────────────────────

/**
 * @route   POST /api/orders/:id/finalize
 * @desc    Finalize order: close it and deduct inventory automatically
 * @access  Private
 */
router.post('/:id/finalize', verifyToken, [
    param('id').trim().notEmpty().withMessage('Order ID is required')
], validate, finalizeOrder);

module.exports = router;
