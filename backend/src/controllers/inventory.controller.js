/**
 * @file inventory.controller.js
 * @description Inventory CRUD controller
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const { db } = require('../config/firebase');
const { DEFAULT_PRIORITIES, STOCK_STATUS } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

// Collection name
const COLLECTION = 'inventory';

/**
 * Get all inventory items
 * GET /api/inventory
 */
const getAllItems = asyncHandler(async (req, res) => {
    const { category, status, search } = req.query;

    if (!db) {
        // Return mock data if Firebase not available
        return res.json({
            success: true,
            data: getMockInventory()
        });
    }

    let query = db.collection(COLLECTION);

    // Apply category filter
    if (category) {
        query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    let items = [];

    snapshot.forEach(doc => {
        items.push({
            id: doc.id,
            ...doc.data()
        });
    });

    // Apply search filter (client-side for flexibility)
    if (search) {
        const searchLower = search.toLowerCase();
        items = items.filter(item =>
            item.name.toLowerCase().includes(searchLower)
        );
    }

    // Apply status filter
    if (status) {
        items = items.filter(item => {
            const stockStatus = calculateStockStatus(item);
            return stockStatus.status === status;
        });
    }

    // Sort by status (urgent first)
    items.sort((a, b) => {
        const statusOrder = { urgent: 4, normal: 3, info: 2, good: 1, optimal: 0 };
        const aStatus = calculateStockStatus(a).status;
        const bStatus = calculateStockStatus(b).status;
        return (statusOrder[bStatus] || 0) - (statusOrder[aStatus] || 0);
    });

    res.json({
        success: true,
        count: items.length,
        data: items
    });
});

/**
 * Get single inventory item by ID
 * GET /api/inventory/:id
 */
const getItemById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
        throw new ApiError(404, 'Item not found');
    }

    const item = {
        id: doc.id,
        ...doc.data(),
        stockStatus: calculateStockStatus(doc.data())
    };

    res.json({
        success: true,
        data: item
    });
});

/**
 * Create new inventory item
 * POST /api/inventory
 */
const createItem = asyncHandler(async (req, res) => {
    const { name, category, stock, priority, alertThreshold } = req.body;

    // Validate required fields
    if (!name || !category) {
        throw new ApiError(400, 'Name and category are required');
    }

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    // Get default priority settings for category
    const defaults = DEFAULT_PRIORITIES[category] || { priority: 'medium', threshold: 3 };

    const newItem = {
        name,
        category,
        stock: stock || 0,
        priority: priority || defaults.priority,
        alertThreshold: alertThreshold || defaults.threshold,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.email
    };

    const docRef = await db.collection(COLLECTION).add(newItem);

    res.status(201).json({
        success: true,
        message: 'Item created successfully',
        data: {
            id: docRef.id,
            ...newItem
        }
    });
});

/**
 * Update inventory item
 * PUT /api/inventory/:id
 */
const updateItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Item not found');
    }

    // Add metadata
    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = req.user.email;

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    res.json({
        success: true,
        message: 'Item updated successfully',
        data: {
            id: updatedDoc.id,
            ...updatedDoc.data()
        }
    });
});

/**
 * Update stock level
 * PATCH /api/inventory/:id/stock
 */
const updateStock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity, action } = req.body; // action: 'add' or 'subtract'

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    if (quantity === undefined || !action) {
        throw new ApiError(400, 'Quantity and action are required');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Item not found');
    }

    const currentStock = doc.data().stock || 0;
    let newStock;

    if (action === 'add') {
        newStock = currentStock + parseInt(quantity);
    } else if (action === 'subtract') {
        newStock = currentStock - parseInt(quantity);
        if (newStock < 0) {
            throw new ApiError(400, 'Cannot have negative stock');
        }
    } else {
        throw new ApiError(400, 'Action must be "add" or "subtract"');
    }

    await docRef.update({
        stock: newStock,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.email
    });

    res.json({
        success: true,
        message: `Stock ${action === 'add' ? 'added' : 'removed'} successfully`,
        data: {
            id,
            previousStock: currentStock,
            newStock,
            change: action === 'add' ? quantity : -quantity
        }
    });
});

/**
 * Delete inventory item
 * DELETE /api/inventory/:id
 */
const deleteItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Item not found');
    }

    await docRef.delete();

    res.json({
        success: true,
        message: 'Item deleted successfully'
    });
});

/**
 * Get inventory statistics
 * GET /api/inventory/stats
 */
const getStats = asyncHandler(async (req, res) => {
    if (!db) {
        return res.json({
            success: true,
            data: {
                total: 0,
                urgent: 0,
                lowStock: 0,
                goodStock: 0
            }
        });
    }

    const snapshot = await db.collection(COLLECTION).get();

    let stats = {
        total: 0,
        urgent: 0,
        lowStock: 0,
        goodStock: 0,
        byCategory: {}
    };

    snapshot.forEach(doc => {
        const item = doc.data();
        const status = calculateStockStatus(item);

        stats.total++;

        if (status.status === STOCK_STATUS.URGENT) {
            stats.urgent++;
        } else if (status.status === STOCK_STATUS.NORMAL || status.status === STOCK_STATUS.INFO) {
            stats.lowStock++;
        } else {
            stats.goodStock++;
        }

        // Count by category
        if (!stats.byCategory[item.category]) {
            stats.byCategory[item.category] = { total: 0, lowStock: 0 };
        }
        stats.byCategory[item.category].total++;
        if ([STOCK_STATUS.URGENT, STOCK_STATUS.NORMAL, STOCK_STATUS.INFO].includes(status.status)) {
            stats.byCategory[item.category].lowStock++;
        }
    });

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Calculate stock status for an item
 */
function calculateStockStatus(item) {
    const threshold = item.alertThreshold || DEFAULT_PRIORITIES[item.category]?.threshold || 3;
    const priority = item.priority || DEFAULT_PRIORITIES[item.category]?.priority || 'medium';
    const stock = item.stock || 0;

    if (stock <= threshold) {
        switch (priority) {
            case 'high':
                return { status: STOCK_STATUS.URGENT, message: 'URGENT: Needs immediate restock!' };
            case 'medium':
                return { status: STOCK_STATUS.NORMAL, message: 'Normal: Restock soon' };
            case 'low':
                return { status: STOCK_STATUS.INFO, message: 'Info: Low stock noted' };
        }
    } else if (stock <= threshold * 2) {
        return { status: STOCK_STATUS.GOOD, message: 'Good: Stock adequate' };
    }

    return { status: STOCK_STATUS.OPTIMAL, message: 'Optimal: Well stocked' };
}

/**
 * Get mock inventory data (for development)
 */
function getMockInventory() {
    return [
        { id: '1', name: 'Absolut Vodka', category: 'Spirits', stock: 5, priority: 'high', alertThreshold: 2 },
        { id: '2', name: 'Jack Daniels', category: 'Spirits', stock: 3, priority: 'high', alertThreshold: 2 },
        { id: '3', name: 'Cabernet Sauvignon', category: 'Wines', stock: 8, priority: 'medium', alertThreshold: 3 },
        { id: '4', name: 'Corona Beer', category: 'Beers', stock: 24, priority: 'medium', alertThreshold: 6 },
        { id: '5', name: 'Coca Cola', category: 'Soft Drinks', stock: 36, priority: 'low', alertThreshold: 12 },
        { id: '6', name: 'Simple Syrup', category: 'Syrups', stock: 2, priority: 'medium', alertThreshold: 2 }
    ];
}

module.exports = {
    getAllItems,
    getItemById,
    createItem,
    updateItem,
    updateStock,
    deleteItem,
    getStats
};
