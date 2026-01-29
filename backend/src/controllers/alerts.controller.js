/**
 * @file alerts.controller.js
 * @description Alerts generation and management controller
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const { db } = require('../config/firebase');
const { DEFAULT_PRIORITIES, STOCK_STATUS } = require('../config/constants');
const { asyncHandler } = require('../middleware/errorHandler');

const COLLECTION = 'inventory';

/**
 * Get all alerts
 * GET /api/alerts
 */
const getAlerts = asyncHandler(async (req, res) => {
    if (!db) {
        return res.json({
            success: true,
            data: {
                alerts: [],
                counts: { urgent: 0, normal: 0, info: 0 }
            }
        });
    }

    const snapshot = await db.collection(COLLECTION).get();
    const alerts = [];

    snapshot.forEach(doc => {
        const item = doc.data();
        const stockStatus = calculateStockStatus(item);

        if ([STOCK_STATUS.URGENT, STOCK_STATUS.NORMAL, STOCK_STATUS.INFO].includes(stockStatus.status)) {
            const config = getProductPriority(item);
            alerts.push({
                id: doc.id,
                product: {
                    id: doc.id,
                    name: item.name,
                    category: item.category,
                    stock: item.stock
                },
                status: stockStatus.status,
                message: stockStatus.message,
                priority: config.priority,
                threshold: config.threshold,
                daysUntilEmpty: estimateDaysUntilEmpty(item),
                suggestedQuantity: calculateSuggestedQuantity(item, config)
            });
        }
    });

    // Sort by urgency
    alerts.sort((a, b) => {
        const priorityOrder = { urgent: 3, normal: 2, info: 1 };
        return priorityOrder[b.status] - priorityOrder[a.status];
    });

    const counts = {
        urgent: alerts.filter(a => a.status === STOCK_STATUS.URGENT).length,
        normal: alerts.filter(a => a.status === STOCK_STATUS.NORMAL).length,
        info: alerts.filter(a => a.status === STOCK_STATUS.INFO).length
    };

    res.json({
        success: true,
        data: {
            alerts,
            counts,
            total: alerts.length
        }
    });
});

/**
 * Generate shopping list
 * GET /api/alerts/shopping-list
 */
const getShoppingList = asyncHandler(async (req, res) => {
    if (!db) {
        return res.json({
            success: true,
            data: {
                urgent: [],
                normal: [],
                generatedAt: new Date().toISOString()
            }
        });
    }

    const snapshot = await db.collection(COLLECTION).get();
    const urgent = [];
    const normal = [];

    snapshot.forEach(doc => {
        const item = doc.data();
        const stockStatus = calculateStockStatus(item);
        const config = getProductPriority(item);

        if (stockStatus.status === STOCK_STATUS.URGENT) {
            urgent.push({
                name: item.name,
                category: item.category,
                currentStock: item.stock,
                suggestedQuantity: calculateSuggestedQuantity(item, config)
            });
        } else if (stockStatus.status === STOCK_STATUS.NORMAL) {
            normal.push({
                name: item.name,
                category: item.category,
                currentStock: item.stock,
                suggestedQuantity: calculateSuggestedQuantity(item, config)
            });
        }
    });

    res.json({
        success: true,
        data: {
            urgent,
            normal,
            generatedAt: new Date().toISOString()
        }
    });
});

/**
 * Export alerts as CSV
 * GET /api/alerts/export
 */
const exportAlerts = asyncHandler(async (req, res) => {
    if (!db) {
        return res.status(200)
            .set('Content-Type', 'text/csv')
            .set('Content-Disposition', 'attachment; filename=alerts.csv')
            .send('Product,Category,Stock,Threshold,Priority,Status\n');
    }

    const snapshot = await db.collection(COLLECTION).get();
    let csvContent = 'Product,Category,Current Stock,Threshold,Priority,Status,Message,Days Until Empty\n';

    snapshot.forEach(doc => {
        const item = doc.data();
        const stockStatus = calculateStockStatus(item);
        const config = getProductPriority(item);

        if ([STOCK_STATUS.URGENT, STOCK_STATUS.NORMAL, STOCK_STATUS.INFO].includes(stockStatus.status)) {
            csvContent += `"${item.name}",${item.category},${item.stock},${config.threshold},${config.priority},${stockStatus.status},"${stockStatus.message}",${estimateDaysUntilEmpty(item)}\n`;
        }
    });

    res.status(200)
        .set('Content-Type', 'text/csv')
        .set('Content-Disposition', `attachment; filename=alerts_${new Date().toISOString().split('T')[0]}.csv`)
        .send(csvContent);
});

// Helper functions

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

function getProductPriority(item) {
    const categoryDefault = DEFAULT_PRIORITIES[item.category] || { priority: 'medium', threshold: 3 };
    return {
        priority: item.priority || categoryDefault.priority,
        threshold: item.alertThreshold || categoryDefault.threshold
    };
}

function estimateDaysUntilEmpty(item) {
    const avgDailyConsumption = 2;
    return Math.max(1, Math.ceil((item.stock || 0) / avgDailyConsumption));
}

function calculateSuggestedQuantity(item, config) {
    const targetStock = config.threshold * 3;
    const minimumOrder = 10;
    const neededQuantity = targetStock - (item.stock || 0);
    return Math.max(minimumOrder, neededQuantity);
}

module.exports = {
    getAlerts,
    getShoppingList,
    exportAlerts
};
