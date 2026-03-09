/**
 * @file recipes.controller.js
 * @description Recipes CRUD controller - Admin only
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const { db } = require('../config/firebase');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const COLLECTION = 'recipes';

/**
 * Get all recipes
 * GET /api/recipes
 */
const getAllRecipes = asyncHandler(async (req, res) => {
    const { category, search } = req.query;

    if (!db) {
        return res.json({
            success: true,
            data: getMockRecipes()
        });
    }

    let query = db.collection(COLLECTION);

    if (category) {
        query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    let recipes = [];

    snapshot.forEach(doc => {
        recipes.push({
            id: doc.id,
            ...doc.data()
        });
    });

    if (search) {
        const searchLower = search.toLowerCase();
        recipes = recipes.filter(recipe =>
            recipe.name.toLowerCase().includes(searchLower)
        );
    }

    recipes.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
        success: true,
        count: recipes.length,
        data: recipes
    });
});

/**
 * Get single recipe by ID
 * GET /api/recipes/:id
 */
const getRecipeById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
        throw new ApiError(404, 'Recipe not found');
    }

    res.json({
        success: true,
        data: {
            id: doc.id,
            ...doc.data()
        }
    });
});

/**
 * Create new recipe
 * POST /api/recipes
 *
 * Body example:
 * {
 *   "name": "Margarita",
 *   "category": "Cocktails",
 *   "ingredients": [
 *     { "inventoryItemId": "abc123", "name": "Tequila", "quantity": 50, "unit": "ml" },
 *     { "inventoryItemId": "def456", "name": "Lime Juice", "quantity": 20, "unit": "ml" },
 *     { "inventoryItemId": "ghi789", "name": "Triple Sec", "quantity": 30, "unit": "ml" },
 *     { "inventoryItemId": "jkl012", "name": "Sugar Syrup", "quantity": 10, "unit": "ml" }
 *   ]
 * }
 */
const createRecipe = asyncHandler(async (req, res) => {
    const { name, category, ingredients } = req.body;

    if (!name || !category) {
        throw new ApiError(400, 'Name and category are required');
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        throw new ApiError(400, 'At least one ingredient is required');
    }

    for (const ingredient of ingredients) {
        if (!ingredient.inventoryItemId || !ingredient.name || !ingredient.quantity || !ingredient.unit) {
            throw new ApiError(400, 'Each ingredient must have inventoryItemId, name, quantity, and unit');
        }
        if (ingredient.quantity <= 0) {
            throw new ApiError(400, 'Ingredient quantity must be positive');
        }
    }

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    // Verify all inventory items exist
    for (const ingredient of ingredients) {
        const itemDoc = await db.collection('inventory').doc(ingredient.inventoryItemId).get();
        if (!itemDoc.exists) {
            throw new ApiError(400, `Inventory item not found: ${ingredient.name} (${ingredient.inventoryItemId})`);
        }
    }

    const newRecipe = {
        name,
        category,
        ingredients,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user.email
    };

    const docRef = await db.collection(COLLECTION).add(newRecipe);

    res.status(201).json({
        success: true,
        message: 'Recipe created successfully',
        data: {
            id: docRef.id,
            ...newRecipe
        }
    });
});

/**
 * Update recipe
 * PUT /api/recipes/:id
 */
const updateRecipe = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, category, ingredients } = req.body;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Recipe not found');
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;

    if (ingredients !== undefined) {
        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            throw new ApiError(400, 'At least one ingredient is required');
        }

        for (const ingredient of ingredients) {
            if (!ingredient.inventoryItemId || !ingredient.name || !ingredient.quantity || !ingredient.unit) {
                throw new ApiError(400, 'Each ingredient must have inventoryItemId, name, quantity, and unit');
            }
            if (ingredient.quantity <= 0) {
                throw new ApiError(400, 'Ingredient quantity must be positive');
            }
        }

        // Verify all inventory items exist
        for (const ingredient of ingredients) {
            const itemDoc = await db.collection('inventory').doc(ingredient.inventoryItemId).get();
            if (!itemDoc.exists) {
                throw new ApiError(400, `Inventory item not found: ${ingredient.name} (${ingredient.inventoryItemId})`);
            }
        }

        updates.ingredients = ingredients;
    }

    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = req.user.email;

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    res.json({
        success: true,
        message: 'Recipe updated successfully',
        data: {
            id: updatedDoc.id,
            ...updatedDoc.data()
        }
    });
});

/**
 * Delete recipe
 * DELETE /api/recipes/:id
 */
const deleteRecipe = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Recipe not found');
    }

    await docRef.delete();

    res.json({
        success: true,
        message: 'Recipe deleted successfully'
    });
});

/**
 * Mock recipes for development
 */
function getMockRecipes() {
    return [
        {
            id: '1',
            name: 'Margarita',
            category: 'Cocktails',
            ingredients: [
                { inventoryItemId: '1', name: 'Tequila', quantity: 50, unit: 'ml' },
                { inventoryItemId: '6', name: 'Lime Juice', quantity: 25, unit: 'ml' },
                { inventoryItemId: '8', name: 'Sugar Syrup', quantity: 10, unit: 'ml' }
            ]
        },
        {
            id: '2',
            name: 'Gin Sour',
            category: 'Cocktails',
            ingredients: [
                { inventoryItemId: '3', name: 'Gin', quantity: 50, unit: 'ml' },
                { inventoryItemId: '6', name: 'Lime Juice', quantity: 25, unit: 'ml' },
                { inventoryItemId: '8', name: 'Sugar Syrup', quantity: 15, unit: 'ml' },
                { inventoryItemId: '7', name: 'Eggs', quantity: 1, unit: 'units' }
            ]
        }
    ];
}

module.exports = {
    getAllRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe
};
