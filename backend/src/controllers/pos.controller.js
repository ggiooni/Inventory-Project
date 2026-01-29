/**
 * @file pos.controller.js
 * @description POS Integration controller
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const { db } = require('../config/firebase');
const { POS_SYSTEMS } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const CONFIG_COLLECTION = 'posConfig';

/**
 * Get POS configuration
 * GET /api/pos/config
 */
const getConfig = asyncHandler(async (req, res) => {
    if (!db) {
        return res.json({
            success: true,
            data: {
                connected: false,
                system: null,
                lastSync: null,
                mappedItems: 0
            }
        });
    }

    const doc = await db.collection(CONFIG_COLLECTION).doc('main').get();

    if (!doc.exists) {
        return res.json({
            success: true,
            data: {
                connected: false,
                system: null,
                lastSync: null,
                mappedItems: 0
            }
        });
    }

    const config = doc.data();

    // Don't expose API key
    delete config.apiKey;

    res.json({
        success: true,
        data: config
    });
});

/**
 * Save POS configuration
 * POST /api/pos/config
 */
const saveConfig = asyncHandler(async (req, res) => {
    const { system, apiKey, restaurantId, syncFrequency } = req.body;

    if (!system || !apiKey || !restaurantId) {
        throw new ApiError(400, 'System, API key, and restaurant ID are required');
    }

    if (!POS_SYSTEMS.includes(system)) {
        throw new ApiError(400, `Invalid POS system. Supported: ${POS_SYSTEMS.join(', ')}`);
    }

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const configData = {
        system,
        apiKey, // In production, encrypt this
        restaurantId,
        syncFrequency: syncFrequency || 'realtime',
        connected: true,
        lastSync: new Date().toISOString(),
        updatedBy: req.user.email,
        updatedAt: new Date().toISOString()
    };

    await db.collection(CONFIG_COLLECTION).doc('main').set(configData);

    // Don't return API key
    delete configData.apiKey;

    res.json({
        success: true,
        message: 'POS configuration saved successfully',
        data: configData
    });
});

/**
 * Disconnect POS
 * DELETE /api/pos/config
 */
const disconnect = asyncHandler(async (req, res) => {
    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    await db.collection(CONFIG_COLLECTION).doc('main').update({
        connected: false,
        updatedBy: req.user.email,
        updatedAt: new Date().toISOString()
    });

    res.json({
        success: true,
        message: 'POS disconnected successfully'
    });
});

/**
 * Sync with POS
 * POST /api/pos/sync
 */
const sync = asyncHandler(async (req, res) => {
    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const configDoc = await db.collection(CONFIG_COLLECTION).doc('main').get();

    if (!configDoc.exists || !configDoc.data().connected) {
        throw new ApiError(400, 'POS not connected');
    }

    const config = configDoc.data();

    // In a real implementation, this would:
    // 1. Call the POS API to get recent transactions
    // 2. Parse transactions to extract sold items
    // 3. Map menu items to inventory items
    // 4. Deduct quantities from inventory

    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update sync timestamp
    const updatedConfig = {
        lastSync: new Date().toISOString(),
        autoUpdates: (config.autoUpdates || 0) + Math.floor(Math.random() * 5) + 1
    };

    await db.collection(CONFIG_COLLECTION).doc('main').update(updatedConfig);

    res.json({
        success: true,
        message: 'Sync completed successfully',
        data: {
            lastSync: updatedConfig.lastSync,
            updatedItems: updatedConfig.autoUpdates
        }
    });
});

/**
 * Get menu items from POS
 * GET /api/pos/menu-items
 */
const getMenuItems = asyncHandler(async (req, res) => {
    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const configDoc = await db.collection(CONFIG_COLLECTION).doc('main').get();

    if (!configDoc.exists || !configDoc.data().connected) {
        throw new ApiError(400, 'POS not connected');
    }

    // In a real implementation, this would call the POS API
    // For now, return sample data
    const menuItems = [
        { id: 'menu1', name: 'Classic Margarita', category: 'Cocktails', price: 12.99 },
        { id: 'menu2', name: 'Mojito', category: 'Cocktails', price: 11.99 },
        { id: 'menu3', name: 'Old Fashioned', category: 'Cocktails', price: 13.99 },
        { id: 'menu4', name: 'Gin & Tonic', category: 'Cocktails', price: 10.99 },
        { id: 'menu5', name: 'Draft Beer', category: 'Beers', price: 6.99 },
        { id: 'menu6', name: 'House Wine', category: 'Wines', price: 8.99 }
    ];

    res.json({
        success: true,
        data: menuItems
    });
});

/**
 * Get item mappings
 * GET /api/pos/mappings
 */
const getMappings = asyncHandler(async (req, res) => {
    if (!db) {
        return res.json({
            success: true,
            data: []
        });
    }

    const doc = await db.collection(CONFIG_COLLECTION).doc('mappings').get();

    if (!doc.exists) {
        return res.json({
            success: true,
            data: []
        });
    }

    res.json({
        success: true,
        data: doc.data().mappings || []
    });
});

/**
 * Save item mappings
 * POST /api/pos/mappings
 */
const saveMappings = asyncHandler(async (req, res) => {
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
        throw new ApiError(400, 'Mappings must be an array');
    }

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    await db.collection(CONFIG_COLLECTION).doc('mappings').set({
        mappings,
        updatedBy: req.user.email,
        updatedAt: new Date().toISOString()
    });

    // Update mapped items count
    await db.collection(CONFIG_COLLECTION).doc('main').update({
        mappedItems: mappings.length
    });

    res.json({
        success: true,
        message: 'Mappings saved successfully',
        data: {
            count: mappings.length
        }
    });
});

module.exports = {
    getConfig,
    saveConfig,
    disconnect,
    sync,
    getMenuItems,
    getMappings,
    saveMappings
};
