/**
 * @file menuItems.controller.js
 * @description Menu Items CRUD controller for WaiterApp POS integration
 *
 * Menu items represent what customers can order (e.g., "Classic Margarita").
 * Each menu item has a mandatory recipe that links to inventory items,
 * enabling automatic stock deduction when orders are finalized.
 *
 * The GET endpoints enrich each item with real-time stockInfo:
 *   - servingsLeft: how many servings can be made (limited by scarcest ingredient)
 *   - available: whether at least 1 serving can be made
 *   - lowStock: whether any ingredient is below its alert threshold
 *
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 */

const { db } = require('../config/firebase');
const { BOTTLE_DEFAULTS } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

// Collection names
const COLLECTION = 'menuItems';
const INVENTORY_COLLECTION = 'inventory';

/**
 * Calculate how many servings of a menu item can be made
 * based on current inventory levels.
 *
 * For each ingredient in the recipe, calculates total available ml
 * (openMl + stock * bottleSizeMl) and divides by qtyMl needed per serving.
 * The minimum across all ingredients is the number of servings possible.
 *
 * @param {Array} recipe - Menu item recipe [{inventoryId, qtyMl}]
 * @param {Map} inventoryMap - Map of inventoryId -> inventory document data
 * @returns {Object} { available, servingsLeft, lowStock }
 */
function calculateStockInfo(recipe, inventoryMap) {
    let minServings = Infinity;
    let lowStock = false;

    for (const ingredient of recipe) {
        const invItem = inventoryMap.get(ingredient.inventoryId);

        if (!invItem) {
            // Inventory item was deleted — can't make this dish
            return { available: false, servingsLeft: 0, lowStock: true };
        }

        const stock = invItem.stock || 0;
        const bottleSizeMl = invItem.bottleSizeMl || BOTTLE_DEFAULTS.BOTTLE_SIZE_ML;
        const openMl = invItem.openMl !== undefined ? invItem.openMl : bottleSizeMl;
        const alertThreshold = invItem.alertThreshold || 2;

        let servings;

        if (ingredient.consumeWhole) {
            // Whole-unit items (cans, bottled beers, soft drinks)
            // Each serving = 1 unit from stock, openMl is irrelevant
            servings = stock;
        } else {
            // Pour-based items (spirits, wines, syrups, kegs)
            // Total ml available = open bottle + closed bottles
            const totalMl = openMl + (stock * bottleSizeMl);
            servings = Math.floor(totalMl / (ingredient.qtyMl || 1));
        }

        minServings = Math.min(minServings, servings);

        // Check if this ingredient is running low
        if (stock <= alertThreshold) {
            lowStock = true;
        }
    }

    if (minServings === Infinity) minServings = 0;

    return {
        available: minServings > 0,
        servingsLeft: minServings,
        lowStock
    };
}

/**
 * Get all menu items with real-time stock information
 * GET /api/menu-items
 * Query: ?active=true&category=Cocktails
 */
const getAllMenuItems = asyncHandler(async (req, res) => {
    const { active, category } = req.query;

    if (!db) {
        return res.json({
            success: true,
            data: getMockMenuItems()
        });
    }

    let query = db.collection(COLLECTION);

    if (active !== undefined) {
        query = query.where('active', '==', active === 'true');
    }

    if (category) {
        query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const items = [];

    snapshot.forEach(doc => {
        items.push({
            id: doc.id,
            ...doc.data()
        });
    });

    // Collect all unique inventory IDs from all recipes
    const inventoryIds = new Set();
    for (const item of items) {
        if (item.recipe && Array.isArray(item.recipe)) {
            for (const ingredient of item.recipe) {
                inventoryIds.add(ingredient.inventoryId);
            }
        }
    }

    // Fetch all needed inventory items in one batch
    const inventoryMap = new Map();
    if (inventoryIds.size > 0) {
        const ids = Array.from(inventoryIds);
        // Firestore 'in' queries support max 30 items per batch
        for (let i = 0; i < ids.length; i += 30) {
            const batch = ids.slice(i, i + 30);
            const invSnapshot = await db.collection(INVENTORY_COLLECTION)
                .where('__name__', 'in', batch)
                .get();

            invSnapshot.forEach(doc => {
                inventoryMap.set(doc.id, doc.data());
            });
        }
    }

    // Enrich each menu item with stockInfo
    const enrichedItems = items.map(item => ({
        ...item,
        stockInfo: calculateStockInfo(item.recipe || [], inventoryMap)
    }));

    // Sort by category then name
    enrichedItems.sort((a, b) => {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return (a.name || '').localeCompare(b.name || '');
    });

    res.json({
        success: true,
        count: enrichedItems.length,
        data: enrichedItems
    });
});

/**
 * Get single menu item by ID with detailed stock info
 * GET /api/menu-items/:id
 */
const getMenuItemById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
        throw new ApiError(404, 'Menu item not found');
    }

    const item = { id: doc.id, ...doc.data() };

    // Fetch inventory data for stock info
    const inventoryMap = new Map();
    if (item.recipe && Array.isArray(item.recipe)) {
        for (const ingredient of item.recipe) {
            const invDoc = await db.collection(INVENTORY_COLLECTION).doc(ingredient.inventoryId).get();
            if (invDoc.exists) {
                inventoryMap.set(invDoc.id, invDoc.data());
            }
        }
    }

    item.stockInfo = calculateStockInfo(item.recipe || [], inventoryMap);

    res.json({
        success: true,
        data: item
    });
});

/**
 * Create a new menu item
 * POST /api/menu-items
 *
 * REQUIRES a complete recipe. You cannot add a cocktail to the menu
 * without specifying which bottles it uses and how much of each.
 */
const createMenuItem = asyncHandler(async (req, res) => {
    const { name, price, category, active, recipe } = req.body;

    if (!name || !price || !category) {
        throw new ApiError(400, 'Name, price, and category are required');
    }

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    // Validate recipe is provided and complete
    if (!Array.isArray(recipe) || recipe.length === 0) {
        throw new ApiError(400,
            'Recipe is required. Each menu item must specify which inventory items it uses and how much (in ml) per serving.'
        );
    }

    // Validate each recipe ingredient and verify inventory items exist
    const validatedRecipe = [];

    for (const ingredient of recipe) {
        if (!ingredient.inventoryId) {
            throw new ApiError(400, 'Each recipe ingredient must have an inventoryId');
        }
        if (!ingredient.qtyMl || ingredient.qtyMl <= 0) {
            throw new ApiError(400, 'Each recipe ingredient must have qtyMl greater than 0');
        }

        // Verify the inventory item exists
        const invDoc = await db.collection(INVENTORY_COLLECTION).doc(ingredient.inventoryId).get();
        if (!invDoc.exists) {
            throw new ApiError(400,
                `Inventory item not found: "${ingredient.inventoryId}". Make sure the product exists in inventory before adding it to a recipe.`
            );
        }

        validatedRecipe.push({
            inventoryId: ingredient.inventoryId,
            inventoryName: invDoc.data().name,
            qtyMl: ingredient.qtyMl
        });
    }

    // Check for duplicate menu item name
    const existing = await db.collection(COLLECTION)
        .where('name', '==', name)
        .get();

    if (!existing.empty) {
        throw new ApiError(400, `A menu item with the name "${name}" already exists`);
    }

    const newItem = {
        name,
        price,
        category,
        active: active !== undefined ? active : true,
        recipe: validatedRecipe,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user.email
    };

    const docRef = await db.collection(COLLECTION).add(newItem);

    res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: {
            id: docRef.id,
            ...newItem
        }
    });
});

/**
 * Update a menu item
 * PUT /api/menu-items/:id
 *
 * If recipe is updated, all ingredients are re-validated.
 */
const updateMenuItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, price, category, active, recipe } = req.body;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Menu item not found');
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (category !== undefined) updates.category = category;
    if (active !== undefined) updates.active = active;

    // If recipe is being updated, validate it fully
    if (recipe !== undefined) {
        if (!Array.isArray(recipe) || recipe.length === 0) {
            throw new ApiError(400, 'Recipe must have at least one ingredient');
        }

        const validatedRecipe = [];

        for (const ingredient of recipe) {
            if (!ingredient.inventoryId) {
                throw new ApiError(400, 'Each recipe ingredient must have an inventoryId');
            }
            if (!ingredient.qtyMl || ingredient.qtyMl <= 0) {
                throw new ApiError(400, 'Each recipe ingredient must have qtyMl greater than 0');
            }

            const invDoc = await db.collection(INVENTORY_COLLECTION).doc(ingredient.inventoryId).get();
            if (!invDoc.exists) {
                throw new ApiError(400,
                    `Inventory item not found: "${ingredient.inventoryId}". Make sure the product exists in inventory.`
                );
            }

            validatedRecipe.push({
                inventoryId: ingredient.inventoryId,
                inventoryName: invDoc.data().name,
                qtyMl: ingredient.qtyMl
            });
        }

        updates.recipe = validatedRecipe;
    }

    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = req.user.email;

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    res.json({
        success: true,
        message: 'Menu item updated successfully',
        data: {
            id: updatedDoc.id,
            ...updatedDoc.data()
        }
    });
});

/**
 * Delete a menu item
 * DELETE /api/menu-items/:id
 *
 * Cannot delete if there are open orders referencing this item.
 */
const deleteMenuItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Menu item not found');
    }

    // Check for open orders that reference this menu item
    const openOrders = await db.collection('orders')
        .where('status', '==', 'open')
        .get();

    for (const orderDoc of openOrders.docs) {
        const itemsSnapshot = await orderDoc.ref.collection('items')
            .where('menuItemId', '==', id)
            .get();

        if (!itemsSnapshot.empty) {
            throw new ApiError(400,
                'Cannot delete this menu item because it is referenced in open orders. Close all related orders first.'
            );
        }
    }

    await docRef.delete();

    res.json({
        success: true,
        message: 'Menu item deleted successfully'
    });
});

/**
 * Mock data for development
 */
function getMockMenuItems() {
    return [
        {
            id: '1', name: 'Classic Margarita', price: 12.99, category: 'Cocktails', active: true,
            recipe: [
                { inventoryId: '1', inventoryName: 'Tequila', qtyMl: 50 },
                { inventoryId: '6', inventoryName: 'Lime Juice', qtyMl: 25 },
                { inventoryId: '8', inventoryName: 'Sugar Syrup', qtyMl: 10 }
            ],
            stockInfo: { available: true, servingsLeft: 15, lowStock: false }
        },
        {
            id: '2', name: 'Gin & Tonic', price: 10.99, category: 'Cocktails', active: true,
            recipe: [{ inventoryId: '3', inventoryName: 'Gin', qtyMl: 50 }],
            stockInfo: { available: true, servingsLeft: 20, lowStock: false }
        },
        {
            id: '3', name: 'House Red Wine', price: 8.99, category: 'Wines', active: true,
            recipe: [{ inventoryId: '4', inventoryName: 'Vino Chileno Merlot', qtyMl: 150 }],
            stockInfo: { available: true, servingsLeft: 5, lowStock: true }
        },
        {
            id: '4', name: 'Draft Guinness', price: 6.99, category: 'Beers', active: true,
            recipe: [{ inventoryId: '5', inventoryName: 'Guinness Keg 30L', qtyMl: 500 }],
            stockInfo: { available: true, servingsLeft: 60, lowStock: false }
        }
    ];
}

module.exports = {
    getAllMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem
};
