/**
 * @file tables.controller.js
 * @description Tables CRUD controller for WaiterApp POS integration
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 */

const { db } = require('../config/firebase');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

// Collection name
const COLLECTION = 'tables';

/**
 * Get all tables
 * GET /api/tables
 * Query: ?active=true
 */
const getAllTables = asyncHandler(async (req, res) => {
    const { active } = req.query;

    if (!db) {
        return res.json({
            success: true,
            data: getMockTables()
        });
    }

    let query = db.collection(COLLECTION);

    // Filter by active status if provided
    if (active !== undefined) {
        query = query.where('active', '==', active === 'true');
    }

    const snapshot = await query.get();
    const tables = [];

    snapshot.forEach(doc => {
        tables.push({
            id: doc.id,
            ...doc.data()
        });
    });

    // Sort alphabetically by name
    tables.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
        success: true,
        count: tables.length,
        data: tables
    });
});

/**
 * Get single table by ID
 * GET /api/tables/:id
 */
const getTableById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
        throw new ApiError(404, 'Table not found');
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
 * Create a new table
 * POST /api/tables
 */
const createTable = asyncHandler(async (req, res) => {
    const { name, active } = req.body;

    if (!name) {
        throw new ApiError(400, 'Table name is required');
    }

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    // Check for duplicate table name
    const existing = await db.collection(COLLECTION)
        .where('name', '==', name)
        .get();

    if (!existing.empty) {
        throw new ApiError(400, `A table with the name "${name}" already exists`);
    }

    const newTable = {
        name,
        active: active !== undefined ? active : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user.email
    };

    const docRef = await db.collection(COLLECTION).add(newTable);

    res.status(201).json({
        success: true,
        message: 'Table created successfully',
        data: {
            id: docRef.id,
            ...newTable
        }
    });
});

/**
 * Update a table
 * PUT /api/tables/:id
 */
const updateTable = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, active } = req.body;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Table not found');
    }

    // Check for duplicate name if changing name
    if (name !== undefined && name !== doc.data().name) {
        const existing = await db.collection(COLLECTION)
            .where('name', '==', name)
            .get();

        if (!existing.empty) {
            throw new ApiError(400, `A table with the name "${name}" already exists`);
        }
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (active !== undefined) updates.active = active;

    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = req.user.email;

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    res.json({
        success: true,
        message: 'Table updated successfully',
        data: {
            id: updatedDoc.id,
            ...updatedDoc.data()
        }
    });
});

/**
 * Delete a table
 * DELETE /api/tables/:id
 */
const deleteTable = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Table not found');
    }

    // Check if table has open orders before deleting
    const openOrders = await db.collection('orders')
        .where('table', '==', doc.data().name)
        .where('status', '==', 'open')
        .get();

    if (!openOrders.empty) {
        throw new ApiError(400, 'Cannot delete table with open orders. Close all orders first.');
    }

    await docRef.delete();

    res.json({
        success: true,
        message: 'Table deleted successfully'
    });
});

/**
 * Mock data for development
 */
function getMockTables() {
    return [
        { id: '1', name: 'Table 1', active: true },
        { id: '2', name: 'Table 2', active: true },
        { id: '3', name: 'Table 3', active: true },
        { id: '4', name: 'Bar 1', active: true },
        { id: '5', name: 'Patio 1', active: false }
    ];
}

module.exports = {
    getAllTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable
};
