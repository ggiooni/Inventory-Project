/**
 * @file tables.routes.js
 * @description Table management routes for WaiterApp POS integration
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const {
    getAllTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable
} = require('../controllers/tables.controller');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

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
 * @route   GET /api/tables
 * @desc    Get all tables (optional ?active=true filter)
 * @access  Private
 */
router.get('/', verifyToken, getAllTables);

/**
 * @route   GET /api/tables/:id
 * @desc    Get single table by ID
 * @access  Private
 */
router.get('/:id', verifyToken, getTableById);

/**
 * @route   POST /api/tables
 * @desc    Create a new table
 * @access  Private (Manager/Admin)
 */
router.post('/', verifyToken, isManagerOrAdmin, [
    body('name').trim().notEmpty().withMessage('Table name is required'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean')
], validate, createTable);

/**
 * @route   PUT /api/tables/:id
 * @desc    Update a table
 * @access  Private (Manager/Admin)
 */
router.put('/:id', verifyToken, isManagerOrAdmin, [
    param('id').trim().notEmpty().withMessage('Table ID is required'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean')
], validate, updateTable);

/**
 * @route   DELETE /api/tables/:id
 * @desc    Delete a table
 * @access  Private (Manager/Admin)
 */
router.delete('/:id', verifyToken, isManagerOrAdmin, deleteTable);

module.exports = router;
