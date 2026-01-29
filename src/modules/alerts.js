/**
 * @file alerts.js
 * @module modules/alerts
 * @description Alert System Module - Stock level monitoring and notifications
 * @author Nicolas Boggioni Troncoso
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 * @version 1.0.0
 * @date 2025
 *
 * This module implements the intelligent alert system that:
 * - Generates alerts based on stock levels and priorities
 * - Categorizes alerts by urgency (urgent, normal, info)
 * - Provides export functionality (shopping lists, CSV)
 * - Integrates with the AI module for smart recommendations
 *
 * Algorithm: Three-tier priority-based alert generation
 * - High priority + Low stock = Urgent
 * - Medium priority + Low stock = Normal
 * - Low priority + Low stock = Info
 *
 * @requires modules/inventory
 */

import {
    getInventoryItems,
    getProductPriority,
    calculateStockStatus
} from './inventory.js';
import { STOCK_STATUS, MAX_VISIBLE_ALERTS } from '../config/constants.js';

// =============================================
// MODULE STATE
// =============================================

/**
 * Alert state container
 * @private
 * @type {Object}
 */
const alertState = {
    /** @type {Array<Object>} Generated alerts */
    alerts: [],
    /** @type {number} Count of urgent alerts */
    urgentCount: 0,
    /** @type {number} Count of normal alerts */
    normalCount: 0,
    /** @type {number} Count of info alerts */
    infoCount: 0
};

/**
 * Registered alert change listeners
 * @private
 * @type {Array<Function>}
 */
const alertListeners = [];

// =============================================
// PUBLIC API - GETTERS
// =============================================

/**
 * Get all generated alerts
 * @returns {Array<Object>} Copy of alerts array
 */
export function getAlerts() {
    return [...alertState.alerts];
}

/**
 * Get alert counts by category
 * @returns {Object} Object with urgent, normal, and info counts
 */
export function getAlertCounts() {
    return {
        urgent: alertState.urgentCount,
        normal: alertState.normalCount,
        info: alertState.infoCount,
        total: alertState.alerts.length
    };
}

/**
 * Get alerts for display (limited to MAX_VISIBLE_ALERTS)
 * @returns {Array<Object>} Limited array of alerts for UI display
 */
export function getDisplayAlerts() {
    return alertState.alerts.slice(0, MAX_VISIBLE_ALERTS);
}

/**
 * Check if there are more alerts than displayed
 * @returns {number} Number of additional alerts not displayed
 */
export function getHiddenAlertCount() {
    return Math.max(0, alertState.alerts.length - MAX_VISIBLE_ALERTS);
}

// =============================================
// PUBLIC API - ALERT GENERATION
// =============================================

/**
 * Generate alerts based on current inventory state
 * This is the main algorithm that analyzes all products and creates
 * appropriate alerts based on stock levels and priority settings.
 *
 * @returns {Array<Object>} Generated alerts sorted by urgency
 *
 * @example
 * const alerts = generateAlerts();
 * alerts.forEach(alert => {
 *     console.log(`${alert.status}: ${alert.product.name}`);
 * });
 */
export function generateAlerts() {
    const inventoryItems = getInventoryItems();
    alertState.alerts = [];

    inventoryItems.forEach(product => {
        const stockInfo = calculateStockStatus(product);
        const config = getProductPriority(product);

        // Only create alerts for items that need attention
        if ([STOCK_STATUS.URGENT, STOCK_STATUS.NORMAL, STOCK_STATUS.INFO].includes(stockInfo.status)) {
            alertState.alerts.push({
                /** @type {Object} The product this alert is for */
                product: product,
                /** @type {string} Alert status (urgent, normal, info) */
                status: stockInfo.status,
                /** @type {string} Human-readable status message */
                message: stockInfo.message,
                /** @type {string} Product priority level */
                priority: config.priority,
                /** @type {number} Stock threshold that triggered the alert */
                threshold: config.threshold,
                /** @type {number} Estimated days until stock runs out */
                daysUntilEmpty: estimateDaysUntilEmpty(product),
                /** @type {number} Suggested restock quantity */
                suggestedQuantity: calculateSuggestedQuantity(product, config)
            });
        }
    });

    // Sort alerts by urgency (most urgent first)
    alertState.alerts.sort((a, b) => {
        const priorityOrder = {
            [STOCK_STATUS.URGENT]: 3,
            [STOCK_STATUS.NORMAL]: 2,
            [STOCK_STATUS.INFO]: 1
        };
        return priorityOrder[b.status] - priorityOrder[a.status];
    });

    // Update counts
    alertState.urgentCount = alertState.alerts.filter(a => a.status === STOCK_STATUS.URGENT).length;
    alertState.normalCount = alertState.alerts.filter(a => a.status === STOCK_STATUS.NORMAL).length;
    alertState.infoCount = alertState.alerts.filter(a => a.status === STOCK_STATUS.INFO).length;

    // Notify listeners
    notifyAlertListeners();

    return alertState.alerts;
}

// =============================================
// PUBLIC API - EXPORT FUNCTIONS
// =============================================

/**
 * Generate a formatted shopping list from current alerts
 *
 * @returns {Object} Shopping list object with text and metadata
 *
 * @example
 * const result = generateShoppingList();
 * downloadTextFile(result.text, result.filename);
 */
export function generateShoppingList() {
    const urgentItems = alertState.alerts.filter(a => a.status === STOCK_STATUS.URGENT);
    const normalItems = alertState.alerts.filter(a => a.status === STOCK_STATUS.NORMAL);

    const dateStr = new Date().toLocaleDateString();
    let list = `SHOPPING LIST - ${dateStr}\n`;
    list += '='.repeat(40) + '\n\n';

    if (urgentItems.length > 0) {
        list += 'URGENT (Buy Today):\n';
        list += '-'.repeat(20) + '\n';
        urgentItems.forEach(alert => {
            list += `* ${alert.product.name}\n`;
            list += `  Current: ${alert.product.stock} units\n`;
            list += `  Suggested: ${alert.suggestedQuantity} units\n\n`;
        });
    }

    if (normalItems.length > 0) {
        list += '\nNORMAL (Buy This Week):\n';
        list += '-'.repeat(20) + '\n';
        normalItems.forEach(alert => {
            list += `* ${alert.product.name}\n`;
            list += `  Current: ${alert.product.stock} units\n`;
            list += `  Suggested: ${alert.suggestedQuantity} units\n\n`;
        });
    }

    if (urgentItems.length === 0 && normalItems.length === 0) {
        list += 'No items need restocking at this time.\n';
    }

    list += '\n' + '='.repeat(40) + '\n';
    list += 'Generated by Smart Inventory System\n';

    return {
        text: list,
        filename: `shopping_list_${new Date().toISOString().split('T')[0]}.txt`,
        urgentCount: urgentItems.length,
        normalCount: normalItems.length
    };
}

/**
 * Export alerts as CSV format
 *
 * @returns {Object} CSV data object with content and metadata
 *
 * @example
 * const result = exportAlertsAsCSV();
 * downloadFile(result.content, result.filename, 'text/csv');
 */
export function exportAlertsAsCSV() {
    const headers = [
        'Product',
        'Category',
        'Current Stock',
        'Threshold',
        'Priority',
        'Status',
        'Message',
        'Days Until Empty',
        'Suggested Quantity'
    ];

    const rows = alertState.alerts.map(alert => [
        `"${alert.product.name}"`,
        alert.product.category,
        alert.product.stock,
        alert.threshold,
        alert.priority,
        alert.status.toUpperCase(),
        `"${alert.message}"`,
        alert.daysUntilEmpty,
        alert.suggestedQuantity
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    return {
        content: csvContent,
        filename: `inventory_alerts_${new Date().toISOString().split('T')[0]}.csv`,
        rowCount: alertState.alerts.length
    };
}

// =============================================
// PUBLIC API - ALERT ACTIONS
// =============================================

/**
 * Get quick restock suggestion for a specific product
 *
 * @param {string} productId - The product's document ID
 * @returns {Object|null} Restock suggestion or null if product not found
 */
export function getRestockSuggestion(productId) {
    const alert = alertState.alerts.find(a => a.product.id === productId);

    if (!alert) {
        // Check if it's in inventory but not in alerts
        const items = getInventoryItems();
        const product = items.find(p => p.id === productId);
        if (product) {
            const config = getProductPriority(product);
            return {
                product: product,
                currentStock: product.stock,
                suggestedQuantity: calculateSuggestedQuantity(product, config),
                priority: config.priority
            };
        }
        return null;
    }

    return {
        product: alert.product,
        currentStock: alert.product.stock,
        suggestedQuantity: alert.suggestedQuantity,
        priority: alert.priority,
        status: alert.status
    };
}

// =============================================
// PUBLIC API - LISTENERS
// =============================================

/**
 * Register a listener for alert changes
 * @param {Function} listener - Function to call when alerts change
 * @returns {Function} Unsubscribe function
 */
export function onAlertsChange(listener) {
    if (typeof listener === 'function') {
        alertListeners.push(listener);

        return () => {
            const index = alertListeners.indexOf(listener);
            if (index > -1) {
                alertListeners.splice(index, 1);
            }
        };
    }
    return () => {};
}

// =============================================
// PRIVATE HELPERS
// =============================================

/**
 * Estimate days until stock runs out based on average consumption
 * Uses a simplified model assuming 2 units consumed per day
 *
 * @private
 * @param {Object} product - The product to estimate for
 * @returns {number} Estimated days until empty
 *
 * @todo Implement actual consumption tracking for accurate predictions
 */
function estimateDaysUntilEmpty(product) {
    // Simplified estimation: assume average consumption of 2 units/day
    // In a production system, this would use historical sales data
    const averageDailyConsumption = 2;
    return Math.max(1, Math.ceil(product.stock / averageDailyConsumption));
}

/**
 * Calculate suggested restock quantity
 * Aims to bring stock to 3x the threshold (approximately 2 weeks)
 *
 * @private
 * @param {Object} product - The product
 * @param {Object} config - Priority configuration
 * @returns {number} Suggested quantity to order
 */
function calculateSuggestedQuantity(product, config) {
    // Target: 3x threshold or minimum of 10 units
    const targetStock = config.threshold * 3;
    const minimumOrder = 10;
    const neededQuantity = targetStock - product.stock;

    return Math.max(minimumOrder, neededQuantity);
}

/**
 * Notify all registered listeners of alert changes
 * @private
 */
function notifyAlertListeners() {
    const counts = getAlertCounts();

    alertListeners.forEach(listener => {
        try {
            listener(alertState.alerts, counts);
        } catch (error) {
            console.error('Error in alert change listener:', error);
        }
    });
}

/**
 * Clear all alert state (for cleanup)
 */
export function clearAlerts() {
    alertState.alerts = [];
    alertState.urgentCount = 0;
    alertState.normalCount = 0;
    alertState.infoCount = 0;
    alertListeners.length = 0;
}
