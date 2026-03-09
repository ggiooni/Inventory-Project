/**
 * @file recipes.routes.js
 * @description Recipe management routes - Admin only
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const {
    getAllRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe
} = require('../controllers/recipes.controller');
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
 * @route   GET /api/recipes
 * @desc    Get all recipes
 * @access  Private (any authenticated user can view recipes)
 */
router.get('/', verifyToken, getAllRecipes);

/**
 * @route   GET /api/recipes/:id
 * @desc    Get single recipe
 * @access  Private
 */
router.get('/:id', verifyToken, getRecipeById);

/**
 * @route   POST /api/recipes
 * @desc    Create new recipe
 * @access  Private (Admin only)
 */
router.post('/', verifyToken, isAdmin, [
    body('name').trim().notEmpty().withMessage('Recipe name is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    body('ingredients.*.inventoryItemId').trim().notEmpty().withMessage('Inventory item ID is required'),
    body('ingredients.*.name').trim().notEmpty().withMessage('Ingredient name is required'),
    body('ingredients.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
    body('ingredients.*.unit').trim().notEmpty().withMessage('Unit is required')
], validate, createRecipe);

/**
 * @route   PUT /api/recipes/:id
 * @desc    Update recipe
 * @access  Private (Admin only)
 */
router.put('/:id', verifyToken, isAdmin, [
    param('id').trim().notEmpty().withMessage('Recipe ID is required'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('ingredients').optional().isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    body('ingredients.*.inventoryItemId').optional().trim().notEmpty().withMessage('Inventory item ID is required'),
    body('ingredients.*.name').optional().trim().notEmpty().withMessage('Ingredient name is required'),
    body('ingredients.*.quantity').optional().isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
    body('ingredients.*.unit').optional().trim().notEmpty().withMessage('Unit is required')
], validate, updateRecipe);

/**
 * @route   DELETE /api/recipes/:id
 * @desc    Delete recipe
 * @access  Private (Admin only)
 */
router.delete('/:id', verifyToken, isAdmin, deleteRecipe);

module.exports = router;
