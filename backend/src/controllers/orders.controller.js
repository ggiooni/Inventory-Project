/**
 * @file orders.controller.js
 * @description Orders CRUD controller with inventory deduction for WaiterApp POS integration
 *
 * This controller handles the complete order lifecycle:
 *   1. Create an order (assigned to a table)
 *   2. Add items to the order (auto-increment qty if item already exists)
 *   3. Finalize the order — this is the CRITICAL endpoint that:
 *      - Reads all order items and their recipes
 *      - Calculates total ml consumption per inventory item
 *      - Deducts from open bottles first, then opens new bottles
 *      - Uses a Firestore transaction for atomicity (all-or-nothing)
 *      - Returns stock warnings for low inventory
 *
 * The finalize algorithm mirrors the logic in Fernando's WaiterApp
 * (FinalizeOrderService.kt), ensuring consistency between direct
 * Firestore access and API-based access.
 *
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 */

const { db } = require('../config/firebase');
const { ORDER_STATUS, ORDER_ITEM_STATUS, BOTTLE_DEFAULTS } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

// Collection names
const COLLECTION = 'orders';
const MENU_ITEMS_COLLECTION = 'menuItems';
const INVENTORY_COLLECTION = 'inventory';

/**
 * Get all orders
 * GET /api/orders
 * Query: ?table=Table 1&status=open
 */
const getAllOrders = asyncHandler(async (req, res) => {
    const { table, status } = req.query;

    if (!db) {
        return res.json({
            success: true,
            data: getMockOrders()
        });
    }

    let query = db.collection(COLLECTION);

    if (table) {
        query = query.where('table', '==', table);
    }

    if (status) {
        query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const orders = [];

    snapshot.forEach(doc => {
        orders.push({
            id: doc.id,
            ...doc.data()
        });
    });

    // Sort: open orders first, then by creation date (newest first)
    orders.sort((a, b) => {
        if (a.status === ORDER_STATUS.OPEN && b.status !== ORDER_STATUS.OPEN) return -1;
        if (a.status !== ORDER_STATUS.OPEN && b.status === ORDER_STATUS.OPEN) return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    res.json({
        success: true,
        count: orders.length,
        data: orders
    });
});

/**
 * Get single order by ID with all its items
 * GET /api/orders/:id
 */
const getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
        throw new ApiError(404, 'Order not found');
    }

    // Fetch order items from subcollection
    const itemsSnapshot = await doc.ref.collection('items').get();
    const items = [];

    itemsSnapshot.forEach(itemDoc => {
        items.push({
            id: itemDoc.id,
            ...itemDoc.data()
        });
    });

    // Calculate order total
    const total = items.reduce((sum, item) => {
        return sum + (item.unitPrice * item.qty);
    }, 0);

    res.json({
        success: true,
        data: {
            id: doc.id,
            ...doc.data(),
            items,
            total: Math.round(total * 100) / 100
        }
    });
});

/**
 * Create a new order
 * POST /api/orders
 * Body: { table }
 */
const createOrder = asyncHandler(async (req, res) => {
    const { table } = req.body;

    if (!table) {
        throw new ApiError(400, 'Table name is required');
    }

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    // Check if there's already an open order for this table
    const existingOrders = await db.collection(COLLECTION)
        .where('table', '==', table)
        .where('status', '==', ORDER_STATUS.OPEN)
        .get();

    if (!existingOrders.empty) {
        // Return the existing open order instead of creating a new one
        const existingOrder = existingOrders.docs[0];
        return res.json({
            success: true,
            message: 'Open order already exists for this table',
            data: {
                id: existingOrder.id,
                ...existingOrder.data()
            }
        });
    }

    const newOrder = {
        table,
        status: ORDER_STATUS.OPEN,
        createdAt: new Date().toISOString(),
        closedAt: null,
        createdBy: req.user.email,
        updatedBy: req.user.email
    };

    const docRef = await db.collection(COLLECTION).add(newOrder);

    res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
            id: docRef.id,
            ...newOrder
        }
    });
});

/**
 * Add an item to an order
 * POST /api/orders/:id/items
 * Body: { menuItemId, name, unitPrice, qty }
 *
 * If the same menuItemId already exists in the order, increments qty.
 */
const addOrderItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { menuItemId, name, unitPrice, qty } = req.body;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    // Verify order exists and is open
    const orderDoc = await db.collection(COLLECTION).doc(id).get();

    if (!orderDoc.exists) {
        throw new ApiError(404, 'Order not found');
    }

    if (orderDoc.data().status !== ORDER_STATUS.OPEN) {
        throw new ApiError(400, 'Cannot add items to a closed order');
    }

    const itemsRef = orderDoc.ref.collection('items');

    // Check if this menu item already exists in the order
    const existingItems = await itemsRef
        .where('menuItemId', '==', menuItemId)
        .get();

    if (!existingItems.empty) {
        // Increment quantity of existing item
        const existingDoc = existingItems.docs[0];
        const currentQty = existingDoc.data().qty || 0;
        const newQty = currentQty + (qty || 1);

        await existingDoc.ref.update({
            qty: newQty,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Item quantity updated to ${newQty}`,
            data: {
                id: existingDoc.id,
                ...existingDoc.data(),
                qty: newQty
            }
        });
    } else {
        // Add new item to the order
        const newItem = {
            menuItemId,
            name,
            unitPrice,
            qty: qty || 1,
            status: ORDER_ITEM_STATUS.PENDING,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const itemRef = await itemsRef.add(newItem);

        res.status(201).json({
            success: true,
            message: 'Item added to order',
            data: {
                id: itemRef.id,
                ...newItem
            }
        });
    }
});

/**
 * Update an order item (qty, status)
 * PUT /api/orders/:id/items/:itemId
 */
const updateOrderItem = asyncHandler(async (req, res) => {
    const { id, itemId } = req.params;
    const { qty, status } = req.body;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    // Verify order exists and is open
    const orderDoc = await db.collection(COLLECTION).doc(id).get();

    if (!orderDoc.exists) {
        throw new ApiError(404, 'Order not found');
    }

    if (orderDoc.data().status !== ORDER_STATUS.OPEN) {
        throw new ApiError(400, 'Cannot modify items in a closed order');
    }

    const itemRef = orderDoc.ref.collection('items').doc(itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
        throw new ApiError(404, 'Order item not found');
    }

    const updates = {};
    if (qty !== undefined) updates.qty = qty;
    if (status !== undefined) updates.status = status;
    updates.updatedAt = new Date().toISOString();

    await itemRef.update(updates);

    const updatedDoc = await itemRef.get();

    res.json({
        success: true,
        message: 'Order item updated',
        data: {
            id: updatedDoc.id,
            ...updatedDoc.data()
        }
    });
});

/**
 * Delete an order item
 * DELETE /api/orders/:id/items/:itemId
 */
const deleteOrderItem = asyncHandler(async (req, res) => {
    const { id, itemId } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available');
    }

    const orderDoc = await db.collection(COLLECTION).doc(id).get();

    if (!orderDoc.exists) {
        throw new ApiError(404, 'Order not found');
    }

    if (orderDoc.data().status !== ORDER_STATUS.OPEN) {
        throw new ApiError(400, 'Cannot remove items from a closed order');
    }

    const itemRef = orderDoc.ref.collection('items').doc(itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
        throw new ApiError(404, 'Order item not found');
    }

    await itemRef.delete();

    res.json({
        success: true,
        message: 'Order item removed'
    });
});

/**
 * Finalize an order — close it and deduct inventory
 * POST /api/orders/:id/finalize
 *
 * This is the most critical endpoint in the POS integration.
 * It uses a Firestore transaction to ensure atomicity:
 * either ALL inventory deductions succeed, or NONE do.
 *
 * Algorithm (mirrors FinalizeOrderService.kt):
 * 1. Read all order items (exclude cancelled)
 * 2. Fetch menu item recipes to know which bottles are used
 * 3. Aggregate total ml needed per inventory item
 * 4. For each inventory item:
 *    a. Consume from the currently open bottle (openMl) first
 *    b. If more is needed, open new bottles (decrement stock)
 *    c. Generate warnings if stock is running low
 * 5. Write all updates atomically
 */
const finalizeOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!db) {
        throw new ApiError(500, 'Database not available — cannot finalize orders without database');
    }

    // ── Step 1: Validate the order ──────────────────────────────────

    const orderRef = db.collection(COLLECTION).doc(id);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
        throw new ApiError(404, 'Order not found');
    }

    if (orderDoc.data().status !== ORDER_STATUS.OPEN) {
        throw new ApiError(400, 'Order is already closed');
    }

    // ── Step 2: Read all order items ────────────────────────────────

    const itemsSnapshot = await orderRef.collection('items').get();
    const orderItems = [];

    itemsSnapshot.forEach(doc => {
        const data = doc.data();
        // Exclude cancelled items
        if (data.status !== ORDER_ITEM_STATUS.CANCELLED) {
            orderItems.push({ id: doc.id, ref: doc.ref, ...data });
        }
    });

    if (orderItems.length === 0) {
        throw new ApiError(400, 'Order has no items to finalize');
    }

    // ── Step 3: Fetch recipes for all ordered menu items ────────────

    // Build a map of menuItemId -> total quantity ordered
    const menuItemQty = {};
    for (const item of orderItems) {
        menuItemQty[item.menuItemId] = (menuItemQty[item.menuItemId] || 0) + item.qty;
    }

    // Fetch all unique menu items
    const menuItemIds = Object.keys(menuItemQty);
    const menuItemRecipes = {};

    for (const menuItemId of menuItemIds) {
        const menuDoc = await db.collection(MENU_ITEMS_COLLECTION).doc(menuItemId).get();

        if (!menuDoc.exists) {
            throw new ApiError(404, `Menu item not found: ${menuItemId}. Cannot finalize order.`);
        }

        const menuData = menuDoc.data();
        if (!menuData.recipe || menuData.recipe.length === 0) {
            throw new ApiError(400, `Menu item "${menuData.name}" has no recipe. Cannot deduct inventory.`);
        }

        menuItemRecipes[menuItemId] = menuData.recipe;
    }

    // ── Step 4: Aggregate consumption per inventory item ────────────
    // Supports two types:
    //   - Pour-based (qtyMl): measured in ml, consumed from open bottle
    //   - Whole-unit (consumeWhole): cans/bottles, decrement stock by 1

    const consumptionMap = {}; // inventoryId -> { totalMlNeeded, totalUnitsNeeded, name }

    for (const [menuItemId, qty] of Object.entries(menuItemQty)) {
        const recipe = menuItemRecipes[menuItemId];

        for (const ingredient of recipe) {
            if (!consumptionMap[ingredient.inventoryId]) {
                consumptionMap[ingredient.inventoryId] = {
                    totalMlNeeded: 0,
                    totalUnitsNeeded: 0,
                    consumeWhole: false,
                    name: ingredient.inventoryName || ingredient.inventoryId
                };
            }

            if (ingredient.consumeWhole) {
                // Whole-unit: 1 unit per serving ordered
                consumptionMap[ingredient.inventoryId].totalUnitsNeeded += qty;
                consumptionMap[ingredient.inventoryId].consumeWhole = true;
            } else {
                // Pour-based: ml per serving
                consumptionMap[ingredient.inventoryId].totalMlNeeded += (ingredient.qtyMl || 0) * qty;
            }
        }
    }

    // ── Step 5: Execute Firestore transaction ───────────────────────
    // All inventory reads and writes happen inside the transaction
    // to prevent race conditions (e.g., two orders finalizing simultaneously)

    const result = await db.runTransaction(async (transaction) => {
        const warnings = [];
        const inventoryUpdates = [];

        // Read all inventory items within the transaction
        const inventoryRefs = {};
        const inventoryData = {};

        for (const inventoryId of Object.keys(consumptionMap)) {
            const invRef = db.collection(INVENTORY_COLLECTION).doc(inventoryId);
            const invDoc = await transaction.get(invRef);

            if (!invDoc.exists) {
                throw new ApiError(404,
                    `Inventory item "${consumptionMap[inventoryId].name}" not found. Cannot deduct stock.`
                );
            }

            inventoryRefs[inventoryId] = invRef;
            inventoryData[inventoryId] = invDoc.data();
        }

        // Calculate consumption for each inventory item
        for (const [inventoryId, consumption] of Object.entries(consumptionMap)) {
            const invData = inventoryData[inventoryId];

            let stock = invData.stock || 0;
            const bottleSizeMl = invData.bottleSizeMl || BOTTLE_DEFAULTS.BOTTLE_SIZE_ML;
            let openMl = invData.openMl !== undefined ? invData.openMl : bottleSizeMl;
            const minOpenMlWarning = invData.minOpenMlWarning || BOTTLE_DEFAULTS.MIN_OPEN_ML_WARNING;

            if (consumption.consumeWhole) {
                // ── Whole-unit deduction (cans, bottled beers, soft drinks) ──
                // Each serving = 1 unit from stock, openMl is irrelevant
                const needed = consumption.totalUnitsNeeded;

                if (stock < needed) {
                    throw new ApiError(400,
                        `Insufficient inventory for "${consumption.name}". ` +
                        `Need ${needed} units but only ${stock} left.`
                    );
                }

                stock -= needed;

                if (stock <= (invData.alertThreshold || 2)) {
                    warnings.push({
                        inventoryId,
                        name: consumption.name,
                        openMl,
                        stock,
                        message: stock === 0
                            ? 'URGENT: Out of stock!'
                            : `Low stock: ${stock} units remaining`
                    });
                }
            } else {
                // ── Pour-based deduction (spirits, wines, syrups, kegs) ──
                let remaining = consumption.totalMlNeeded;

                // Consume from the currently open bottle first
                const fromOpen = Math.min(openMl, remaining);
                openMl -= fromOpen;
                remaining -= fromOpen;

                // Open new bottles as needed
                while (remaining > 0) {
                    if (stock <= 0) {
                        throw new ApiError(400,
                            `Insufficient inventory for "${consumption.name}". ` +
                            `Need ${remaining}ml more but no bottles left.`
                        );
                    }

                    stock -= 1;
                    openMl = bottleSizeMl;

                    const used = Math.min(openMl, remaining);
                    openMl -= used;
                    remaining -= used;
                }

                // Check for low stock warnings
                if (openMl <= minOpenMlWarning) {
                    warnings.push({
                        inventoryId,
                        name: consumption.name,
                        openMl,
                        stock,
                        message: stock === 0 && openMl <= minOpenMlWarning
                            ? 'URGENT: Last bottle running low!'
                            : 'Low open bottle — consider restocking'
                    });
                }
            }

            // Queue the update
            inventoryUpdates.push({
                inventoryId,
                name: consumption.name,
                newStock: stock,
                newOpenMl: openMl,
                consumed: consumption.consumeWhole
                    ? `${consumption.totalUnitsNeeded} units`
                    : `${consumption.totalMlNeeded}ml`
            });

            // Write inventory update within the transaction
            transaction.update(inventoryRefs[inventoryId], {
                stock,
                openMl,
                lastUpdated: new Date().toISOString()
            });
        }

        // Mark order as closed
        const closedAt = new Date().toISOString();
        transaction.update(orderRef, {
            status: ORDER_STATUS.CLOSED,
            closedAt,
            updatedBy: req.user.email
        });

        // Mark all order items as served
        for (const item of orderItems) {
            transaction.update(item.ref, {
                status: ORDER_ITEM_STATUS.SERVED,
                updatedAt: closedAt
            });
        }

        return { closedAt, inventoryUpdates, warnings };
    });

    // ── Step 6: Return response with summary ────────────────────────

    res.json({
        success: true,
        message: 'Order finalized successfully. Inventory has been updated.',
        data: {
            orderId: id,
            closedAt: result.closedAt,
            itemsServed: orderItems.length,
            inventoryUpdates: result.inventoryUpdates,
            warnings: result.warnings
        }
    });
});

/**
 * Mock data for development
 */
function getMockOrders() {
    return [
        {
            id: '1',
            table: 'Table 1',
            status: 'open',
            createdAt: new Date().toISOString(),
            closedAt: null,
            items: [
                { id: 'item1', menuItemId: '1', name: 'Classic Margarita', unitPrice: 12.99, qty: 2, status: 'pending' }
            ]
        }
    ];
}

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    addOrderItem,
    updateOrderItem,
    deleteOrderItem,
    finalizeOrder
};
