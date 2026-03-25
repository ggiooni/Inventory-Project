/**
 * @file menuItems.routes.js
 * @description Menu item routes for WaiterApp POS integration
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const {
    getAllMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem
} = require('../controllers/menuItems.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

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
 * @route   GET /api/menu-items
 * @desc    Get all menu items with real-time stock indicators
 * @access  Private (any authenticated user — waiters can see the menu)
 */
router.get('/', verifyToken, getAllMenuItems);

/**
 * @route   GET /api/menu-items/:id
 * @desc    Get single menu item with detailed stock info
 * @access  Private
 */
router.get('/:id', verifyToken, getMenuItemById);

/**
 * @route   POST /api/menu-items
 * @desc    Create a new menu item (recipe is MANDATORY)
 * @access  Private (Admin only)
 */
router.post('/', verifyToken, isAdmin, [
    body('name').trim().notEmpty().withMessage('Menu item name is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean'),
    body('recipe').isArray({ min: 1 }).withMessage('Recipe is required with at least one ingredient'),
    body('recipe.*.inventoryId').trim().notEmpty().withMessage('Each ingredient must have an inventoryId'),
    body('recipe.*.qtyMl').isFloat({ gt: 0 }).withMessage('Each ingredient must have qtyMl greater than 0')
], validate, createMenuItem);

/**
 * @route   PUT /api/menu-items/:id
 * @desc    Update a menu item (recipe re-validated if changed)
 * @access  Private (Admin only)
 */
router.put('/:id', verifyToken, isAdmin, [
    param('id').trim().notEmpty().withMessage('Menu item ID is required'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('price').optional().isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean'),
    body('recipe').optional().isArray({ min: 1 }).withMessage('Recipe must have at least one ingredient'),
    body('recipe.*.inventoryId').optional().trim().notEmpty().withMessage('Each ingredient must have an inventoryId'),
    body('recipe.*.qtyMl').optional().isFloat({ gt: 0 }).withMessage('Each ingredient must have qtyMl greater than 0')
], validate, updateMenuItem);

/**
 * @route   DELETE /api/menu-items/:id
 * @desc    Delete a menu item (blocked if referenced in open orders)
 * @access  Private (Admin only)
 */
router.delete('/:id', verifyToken, isAdmin, deleteMenuItem);

module.exports = router;
