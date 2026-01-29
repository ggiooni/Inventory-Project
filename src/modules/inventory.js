/**
 * @file inventory.js
 * @module modules/inventory
 * @description Inventory Management Module - Core CRUD operations for inventory data
 * @author Nicolas Boggioni Troncoso
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 * @version 1.0.0
 * @date 2025
 *
 * This module handles all inventory-related operations including:
 * - Loading inventory data from Firestore
 * - Real-time synchronization with database
 * - Stock updates (add/remove)
 * - Filtering and searching
 * - Priority management
 *
 * @requires firebase/firestore
 * @see {@link https://firebase.google.com/docs/firestore}
 *
 * Design Pattern: Module Pattern with Observable State
 * Data Flow: Unidirectional (Firestore -> Local State -> UI)
 */

import { db } from '../config/firebase.js';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    onSnapshot,
    setDoc,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    DEFAULT_PRIORITIES,
    STOCK_STATUS,
    STATUS_ORDER,
    ERROR_MESSAGES
} from '../config/constants.js';
import { getCurrentUser } from './auth.js';

// =============================================
// MODULE STATE
// =============================================

/**
 * Inventory state container
 * @private
 * @type {Object}
 */
const inventoryState = {
    /** @type {Array<Object>} All inventory items */
    items: [],
    /** @type {Array<Object>} Filtered inventory items */
    filteredItems: [],
    /** @type {Function|null} Firestore unsubscribe function */
    unsubscribe: null,
    /** @type {boolean} Whether data has been loaded */
    isLoaded: false
};

/**
 * Registered change listeners
 * @private
 * @type {Array<Function>}
 */
const changeListeners = [];

// =============================================
// PUBLIC API - GETTERS
// =============================================

/**
 * Get all inventory items
 * @returns {Array<Object>} Copy of inventory items array
 */
export function getInventoryItems() {
    return [...inventoryState.items];
}

/**
 * Get filtered inventory items
 * @returns {Array<Object>} Copy of filtered items array
 */
export function getFilteredItems() {
    return [...inventoryState.filteredItems];
}

/**
 * Get a single inventory item by ID
 * @param {string} itemId - The item's document ID
 * @returns {Object|undefined} The inventory item or undefined
 */
export function getItemById(itemId) {
    return inventoryState.items.find(item => item.id === itemId);
}

/**
 * Check if inventory data has been loaded
 * @returns {boolean} True if data is loaded
 */
export function isDataLoaded() {
    return inventoryState.isLoaded;
}

// =============================================
// PUBLIC API - STOCK CALCULATIONS
// =============================================

/**
 * Get priority configuration for a product
 * Uses product-specific settings or falls back to category defaults
 *
 * @param {Object} product - The product object
 * @returns {Object} Priority configuration with priority level and threshold
 *
 * @example
 * const config = getProductPriority(product);
 * console.log(config.priority); // 'high', 'medium', or 'low'
 * console.log(config.threshold); // number
 */
export function getProductPriority(product) {
    const categoryDefault = DEFAULT_PRIORITIES[product.category] || { priority: 'medium', threshold: 3 };

    return {
        priority: product.priority || categoryDefault.priority,
        threshold: product.alertThreshold || categoryDefault.threshold
    };
}

/**
 * Calculate the stock status for a product
 * Determines urgency based on current stock, threshold, and priority
 *
 * @param {Object} product - The product to evaluate
 * @returns {Object} Status object with status code and message
 *
 * @example
 * const stockInfo = calculateStockStatus(product);
 * if (stockInfo.status === 'urgent') {
 *     // Show urgent alert
 * }
 */
export function calculateStockStatus(product) {
    const config = getProductPriority(product);
    const stock = product.stock;
    const threshold = config.threshold;

    if (stock <= threshold) {
        // Below threshold - determine urgency by priority
        switch (config.priority) {
            case 'high':
                return {
                    status: STOCK_STATUS.URGENT,
                    message: 'URGENT: Needs immediate restock!'
                };
            case 'medium':
                return {
                    status: STOCK_STATUS.NORMAL,
                    message: 'Normal: Restock soon'
                };
            case 'low':
                return {
                    status: STOCK_STATUS.INFO,
                    message: 'Info: Low stock noted'
                };
        }
    } else if (stock <= threshold * 2) {
        return {
            status: STOCK_STATUS.GOOD,
            message: 'Good: Stock adequate'
        };
    }

    return {
        status: STOCK_STATUS.OPTIMAL,
        message: 'Optimal: Well stocked'
    };
}

/**
 * Calculate inventory statistics
 * @returns {Object} Statistics object with counts
 */
export function calculateStats() {
    let urgentCount = 0;
    let lowStockCount = 0;
    let goodStockCount = 0;

    inventoryState.items.forEach(item => {
        const stockInfo = calculateStockStatus(item);
        if (stockInfo.status === STOCK_STATUS.URGENT) {
            urgentCount++;
        } else if (stockInfo.status === STOCK_STATUS.NORMAL || stockInfo.status === STOCK_STATUS.INFO) {
            lowStockCount++;
        } else {
            goodStockCount++;
        }
    });

    return {
        total: inventoryState.items.length,
        urgent: urgentCount,
        lowStock: lowStockCount,
        goodStock: goodStockCount
    };
}

// =============================================
// PUBLIC API - DATA OPERATIONS
// =============================================

/**
 * Load inventory data from Firestore
 * This performs a one-time fetch of all inventory documents
 *
 * @async
 * @returns {Promise<Object>} Result object with success status and data
 *
 * @example
 * const result = await loadInventoryData();
 * if (result.success) {
 *     console.log(`Loaded ${result.count} items`);
 * }
 */
export async function loadInventoryData() {
    const user = getCurrentUser();
    if (!user) {
        console.log('Not authenticated, skipping data load');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        inventoryState.items = [];

        querySnapshot.forEach((doc) => {
            inventoryState.items.push({
                id: doc.id,
                ...doc.data()
            });
        });

        inventoryState.filteredItems = [...inventoryState.items];
        inventoryState.isLoaded = true;

        // Notify listeners
        notifyListeners();

        return {
            success: true,
            count: inventoryState.items.length,
            items: inventoryState.items
        };

    } catch (error) {
        console.error('Error loading inventory data:', error);
        return {
            success: false,
            error: ERROR_MESSAGES.INVENTORY.LOAD_ERROR
        };
    }
}

/**
 * Setup real-time listener for inventory changes
 * This establishes a WebSocket connection to Firestore for live updates
 *
 * @param {Function} onUpdate - Callback when data changes
 * @param {Function} onError - Callback on error
 * @returns {Function} Unsubscribe function
 */
export function setupRealtimeListener(onUpdate, onError) {
    const user = getCurrentUser();
    if (!user) {
        console.log('Not authenticated, skipping real-time setup');
        return () => {};
    }

    // Clean up existing listener
    if (inventoryState.unsubscribe) {
        inventoryState.unsubscribe();
    }

    inventoryState.unsubscribe = onSnapshot(
        collection(db, 'inventory'),
        (snapshot) => {
            inventoryState.items = [];
            snapshot.forEach((doc) => {
                inventoryState.items.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Apply current filters
            notifyListeners();

            if (typeof onUpdate === 'function') {
                onUpdate(inventoryState.items);
            }
        },
        (error) => {
            console.error('Real-time listener error:', error);
            if (typeof onError === 'function') {
                onError(error);
            }
        }
    );

    return inventoryState.unsubscribe;
}

/**
 * Update stock level for a product
 *
 * @async
 * @param {string} itemId - Product document ID
 * @param {number} newStock - New stock value
 * @param {string} updatedBy - Email of user making the change
 * @returns {Promise<Object>} Result object
 *
 * @example
 * const result = await updateStock('item123', 10, 'admin@inventory.com');
 */
export async function updateStock(itemId, newStock, updatedBy) {
    if (newStock < 0) {
        return {
            success: false,
            error: ERROR_MESSAGES.INVENTORY.NEGATIVE_STOCK
        };
    }

    try {
        const itemRef = doc(db, 'inventory', itemId);
        await updateDoc(itemRef, {
            stock: newStock,
            lastUpdated: new Date(),
            updatedBy: updatedBy
        });

        return { success: true };

    } catch (error) {
        console.error('Error updating stock:', error);
        return {
            success: false,
            error: ERROR_MESSAGES.INVENTORY.UPDATE_ERROR
        };
    }
}

/**
 * Update priority settings for a product
 *
 * @async
 * @param {string} itemId - Product document ID
 * @param {string} priority - New priority level ('high', 'medium', 'low')
 * @param {number} threshold - New alert threshold
 * @param {string} updatedBy - Email of user making the change
 * @returns {Promise<Object>} Result object
 */
export async function updatePriority(itemId, priority, threshold, updatedBy) {
    try {
        const itemRef = doc(db, 'inventory', itemId);
        await updateDoc(itemRef, {
            priority: priority,
            alertThreshold: parseInt(threshold),
            lastUpdated: new Date(),
            updatedBy: updatedBy
        });

        return { success: true };

    } catch (error) {
        console.error('Error updating priority:', error);
        return { success: false, error: 'Error updating priority' };
    }
}

/**
 * Reset all products to default priority settings
 *
 * @async
 * @param {string} updatedBy - Email of user making the change
 * @returns {Promise<Object>} Result object with count of updated items
 */
export async function resetToDefaults(updatedBy) {
    const updatePromises = inventoryState.items.map(async (item) => {
        const defaultConfig = DEFAULT_PRIORITIES[item.category];
        if (defaultConfig) {
            try {
                const itemRef = doc(db, 'inventory', item.id);
                await updateDoc(itemRef, {
                    priority: defaultConfig.priority,
                    alertThreshold: defaultConfig.threshold,
                    lastUpdated: new Date(),
                    updatedBy: updatedBy
                });
                return true;
            } catch (error) {
                console.error(`Error resetting priority for ${item.id}:`, error);
                return false;
            }
        }
        return false;
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter(Boolean).length;

    return {
        success: true,
        updatedCount: successCount
    };
}

// =============================================
// PUBLIC API - FILTERING
// =============================================

/**
 * Apply filters to inventory data
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.search] - Search term for product name
 * @param {string} [filters.category] - Category to filter by
 * @param {string} [filters.status] - Stock status to filter by
 * @returns {Array<Object>} Filtered items
 *
 * @example
 * const filtered = applyFilters({
 *     search: 'vodka',
 *     category: 'Spirits',
 *     status: 'urgent'
 * });
 */
export function applyFilters({ search = '', category = '', status = '' }) {
    inventoryState.filteredItems = inventoryState.items.filter(item => {
        // Search filter
        const matchesSearch = !search ||
            item.name.toLowerCase().includes(search.toLowerCase());

        // Category filter
        const matchesCategory = !category || item.category === category;

        // Status filter
        let matchesStatus = true;
        if (status) {
            const stockInfo = calculateStockStatus(item);
            matchesStatus = stockInfo.status === status;
        }

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort by status (urgent first) then by name
    inventoryState.filteredItems.sort((a, b) => {
        const aStatus = calculateStockStatus(a).status;
        const bStatus = calculateStockStatus(b).status;
        const statusDiff = (STATUS_ORDER[bStatus] || 0) - (STATUS_ORDER[aStatus] || 0);

        return statusDiff !== 0 ? statusDiff : a.name.localeCompare(b.name);
    });

    return inventoryState.filteredItems;
}

/**
 * Clear all filters and show all items
 * @returns {Array<Object>} All items
 */
export function clearFilters() {
    inventoryState.filteredItems = [...inventoryState.items];
    return inventoryState.filteredItems;
}

// =============================================
// PUBLIC API - CHANGE LISTENERS
// =============================================

/**
 * Register a listener for inventory changes
 * @param {Function} listener - Function to call when inventory changes
 * @returns {Function} Unsubscribe function
 */
export function onInventoryChange(listener) {
    if (typeof listener === 'function') {
        changeListeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = changeListeners.indexOf(listener);
            if (index > -1) {
                changeListeners.splice(index, 1);
            }
        };
    }
    return () => {};
}

// =============================================
// PRIVATE HELPERS
// =============================================

/**
 * Notify all registered listeners of state change
 * @private
 */
function notifyListeners() {
    changeListeners.forEach(listener => {
        try {
            listener(inventoryState.items, inventoryState.filteredItems);
        } catch (error) {
            console.error('Error in inventory change listener:', error);
        }
    });
}

/**
 * Cleanup function for module teardown
 * @returns {void}
 */
export function cleanup() {
    if (inventoryState.unsubscribe) {
        inventoryState.unsubscribe();
        inventoryState.unsubscribe = null;
    }
    inventoryState.items = [];
    inventoryState.filteredItems = [];
    inventoryState.isLoaded = false;
    changeListeners.length = 0;
}
