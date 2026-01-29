/**
 * @file pos-integration.js
 * @module modules/pos-integration
 * @description POS Integration Module - Point of Sale system connectivity
 * @author Nicolas Boggioni Troncoso
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 * @version 1.0.0
 * @date 2025
 *
 * This module handles integration with various Point of Sale (POS) systems:
 * - Toast POS
 * - Square
 * - Clover
 * - Lightspeed
 *
 * The integration allows automatic inventory updates when sales occur,
 * reducing manual stock tracking and improving accuracy.
 *
 * @requires firebase/firestore
 *
 * Design Pattern: Adapter Pattern for POS system abstraction
 * Note: In production, actual API calls would be made to POS providers
 */

import { db } from '../config/firebase.js';
import {
    collection,
    getDocs,
    doc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { POS_SYSTEMS, SYNC_FREQUENCIES } from '../config/constants.js';
import { getInventoryItems } from './inventory.js';

// =============================================
// MODULE STATE
// =============================================

/**
 * POS configuration state
 * @private
 * @type {Object}
 */
const posState = {
    /** @type {boolean} Whether a POS system is connected */
    connected: false,
    /** @type {string} Current POS system identifier */
    system: POS_SYSTEMS.TOAST,
    /** @type {string|null} ISO timestamp of last sync */
    lastSync: null,
    /** @type {number} Count of mapped menu items */
    mappedItems: 0,
    /** @type {number} Count of automatic updates today */
    autoUpdates: 0,
    /** @type {string} Sync frequency setting */
    syncFrequency: SYNC_FREQUENCIES.REALTIME,
    /** @type {number|null} Sync interval ID */
    syncIntervalId: null
};

/**
 * POS change listeners
 * @private
 * @type {Array<Function>}
 */
const posListeners = [];

// =============================================
// PUBLIC API - GETTERS
// =============================================

/**
 * Get current POS configuration
 * @returns {Object} Copy of POS configuration state
 */
export function getPOSConfig() {
    return { ...posState };
}

/**
 * Check if POS is connected
 * @returns {boolean} Connection status
 */
export function isPOSConnected() {
    return posState.connected;
}

/**
 * Get last sync timestamp
 * @returns {string|null} ISO timestamp or null
 */
export function getLastSyncTime() {
    return posState.lastSync;
}

// =============================================
// PUBLIC API - CONFIGURATION
// =============================================

/**
 * Load POS configuration from Firestore
 *
 * @async
 * @returns {Promise<Object>} Configuration data
 *
 * @example
 * const config = await loadPOSConfig();
 * if (config.connected) {
 *     console.log(`Connected to ${config.system}`);
 * }
 */
export async function loadPOSConfig() {
    try {
        const configCollection = await getDocs(collection(db, 'posConfig'));

        if (!configCollection.empty) {
            configCollection.forEach((docSnapshot) => {
                Object.assign(posState, docSnapshot.data());
            });
            notifyPOSListeners();
        }

        return { ...posState };

    } catch (error) {
        // Handle permission errors gracefully - POS config is optional
        if (error.code === 'permission-denied') {
            console.warn('POS config: No permissions to read. This is normal if POS is not configured yet.');
        } else {
            console.error('Error loading POS config:', error);
        }
        // Return default state - app continues to work without POS
        return { ...posState };
    }
}

/**
 * Save POS configuration to Firestore
 *
 * @async
 * @param {Object} config - Configuration to save
 * @param {string} config.system - POS system identifier
 * @param {string} config.apiKey - API key for the POS system
 * @param {string} config.restaurantId - Location/restaurant ID
 * @param {string} config.syncFrequency - Sync frequency setting
 * @param {string} updatedBy - Email of user making the change
 * @returns {Promise<Object>} Result object
 *
 * @example
 * const result = await savePOSConfig({
 *     system: 'toast',
 *     apiKey: 'your-api-key',
 *     restaurantId: 'location-123',
 *     syncFrequency: 'realtime'
 * }, 'admin@inventory.com');
 */
export async function savePOSConfig(config, updatedBy) {
    try {
        // Validate required fields
        if (!config.apiKey || !config.restaurantId) {
            return {
                success: false,
                error: 'API Key and Restaurant ID are required'
            };
        }

        const configData = {
            system: config.system || POS_SYSTEMS.TOAST,
            apiKey: config.apiKey,  // Note: In production, encrypt this
            restaurantId: config.restaurantId,
            syncFrequency: config.syncFrequency || SYNC_FREQUENCIES.REALTIME,
            connected: true,
            lastSync: new Date().toISOString(),
            updatedBy: updatedBy,
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'posConfig', 'main'), configData);

        // Update local state
        Object.assign(posState, configData);
        notifyPOSListeners();

        // Start sync if realtime
        if (configData.syncFrequency === SYNC_FREQUENCIES.REALTIME) {
            startRealtimeSync();
        }

        return {
            success: true,
            message: 'POS configuration saved successfully'
        };

    } catch (error) {
        console.error('Error saving POS config:', error);
        return {
            success: false,
            error: 'Error saving configuration'
        };
    }
}

/**
 * Disconnect from POS system
 *
 * @async
 * @param {string} updatedBy - Email of user
 * @returns {Promise<Object>} Result object
 */
export async function disconnectPOS(updatedBy) {
    try {
        // Stop any running sync
        stopRealtimeSync();

        const configData = {
            connected: false,
            lastSync: posState.lastSync,
            updatedBy: updatedBy,
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'posConfig', 'main'), configData, { merge: true });

        posState.connected = false;
        notifyPOSListeners();

        return {
            success: true,
            message: 'POS disconnected'
        };

    } catch (error) {
        console.error('Error disconnecting POS:', error);
        return {
            success: false,
            error: 'Error disconnecting'
        };
    }
}

// =============================================
// PUBLIC API - SYNCHRONIZATION
// =============================================

/**
 * Perform manual sync with POS system
 *
 * @async
 * @returns {Promise<Object>} Sync result
 *
 * @example
 * const result = await syncWithPOS();
 * console.log(`Synced ${result.updatedItems} items`);
 */
export async function syncWithPOS() {
    if (!posState.connected) {
        return {
            success: false,
            error: 'POS not connected'
        };
    }

    try {
        // In a real implementation, this would:
        // 1. Call the POS API to get recent transactions
        // 2. Parse the transactions to extract sold items
        // 3. Map menu items to inventory items
        // 4. Deduct sold quantities from inventory

        // Simulate API call delay
        await simulateAPICall(2000);

        // Update sync timestamp
        posState.lastSync = new Date().toISOString();
        posState.autoUpdates = (posState.autoUpdates || 0) + Math.floor(Math.random() * 5) + 1;

        await setDoc(doc(db, 'posConfig', 'main'), {
            lastSync: posState.lastSync,
            autoUpdates: posState.autoUpdates
        }, { merge: true });

        notifyPOSListeners();

        return {
            success: true,
            updatedItems: posState.autoUpdates,
            lastSync: posState.lastSync
        };

    } catch (error) {
        console.error('Error syncing with POS:', error);
        return {
            success: false,
            error: 'Sync failed. Please check your connection.'
        };
    }
}

/**
 * Start real-time synchronization
 * Sets up interval-based polling or webhook listener
 */
export function startRealtimeSync() {
    if (!posState.connected) {
        console.log('Cannot start sync: POS not connected');
        return;
    }

    // Stop any existing sync
    stopRealtimeSync();

    console.log(`Starting real-time sync with ${posState.system.toUpperCase()}`);

    // In a real implementation:
    // - For webhook-based systems: Register webhook endpoint
    // - For polling-based systems: Set up interval

    // For demo, simulate periodic sync
    posState.syncIntervalId = setInterval(() => {
        console.log('Performing periodic sync...');
        syncWithPOS();
    }, 60000); // Every minute for demo
}

/**
 * Stop real-time synchronization
 */
export function stopRealtimeSync() {
    if (posState.syncIntervalId) {
        clearInterval(posState.syncIntervalId);
        posState.syncIntervalId = null;
        console.log('Real-time sync stopped');
    }
}

// =============================================
// PUBLIC API - ITEM MAPPING
// =============================================

/**
 * Get sample menu items from POS
 * In production, this would fetch actual menu items from the POS API
 *
 * @async
 * @returns {Promise<Array<Object>>} Menu items
 */
export async function getMenuItems() {
    if (!posState.connected) {
        return [];
    }

    // In real implementation, call POS API:
    // const response = await fetch(`${POS_API_URL}/menu`, { headers: {...} });
    // return await response.json();

    // Demo sample data
    return [
        { id: 'menu1', name: 'Classic Margarita', category: 'Cocktails' },
        { id: 'menu2', name: 'Mojito', category: 'Cocktails' },
        { id: 'menu3', name: 'Old Fashioned', category: 'Cocktails' },
        { id: 'menu4', name: 'Gin & Tonic', category: 'Cocktails' },
        { id: 'menu5', name: 'Caesar Salad', category: 'Appetizers' },
        { id: 'menu6', name: 'Draft Beer', category: 'Beers' }
    ];
}

/**
 * Save item mappings between menu items and inventory
 *
 * @async
 * @param {Array<Object>} mappings - Item mappings
 * @param {string} mappings[].menuItemId - POS menu item ID
 * @param {Array} mappings[].ingredients - Ingredients with quantities
 * @param {string} updatedBy - Email of user
 * @returns {Promise<Object>} Result object
 */
export async function saveItemMappings(mappings, updatedBy) {
    try {
        await setDoc(doc(db, 'posConfig', 'mappings'), {
            mappings: mappings,
            updatedBy: updatedBy,
            updatedAt: new Date().toISOString()
        });

        posState.mappedItems = mappings.length;

        await setDoc(doc(db, 'posConfig', 'main'), {
            mappedItems: posState.mappedItems
        }, { merge: true });

        notifyPOSListeners();

        return {
            success: true,
            mappedCount: mappings.length
        };

    } catch (error) {
        console.error('Error saving mappings:', error);
        return {
            success: false,
            error: 'Error saving mappings'
        };
    }
}

/**
 * Get existing item mappings
 *
 * @async
 * @returns {Promise<Array<Object>>} Saved mappings
 */
export async function getItemMappings() {
    try {
        const mappingDoc = await getDocs(collection(db, 'posConfig'));
        let mappings = [];

        mappingDoc.forEach((docSnapshot) => {
            if (docSnapshot.id === 'mappings') {
                mappings = docSnapshot.data().mappings || [];
            }
        });

        return mappings;

    } catch (error) {
        console.error('Error loading mappings:', error);
        return [];
    }
}

// =============================================
// PUBLIC API - LISTENERS
// =============================================

/**
 * Register a listener for POS state changes
 * @param {Function} listener - Callback function
 * @returns {Function} Unsubscribe function
 */
export function onPOSChange(listener) {
    if (typeof listener === 'function') {
        posListeners.push(listener);

        return () => {
            const index = posListeners.indexOf(listener);
            if (index > -1) {
                posListeners.splice(index, 1);
            }
        };
    }
    return () => {};
}

// =============================================
// PRIVATE HELPERS
// =============================================

/**
 * Simulate an API call with delay
 * @private
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function simulateAPICall(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Notify all registered POS listeners
 * @private
 */
function notifyPOSListeners() {
    const config = getPOSConfig();

    posListeners.forEach(listener => {
        try {
            listener(config);
        } catch (error) {
            console.error('Error in POS listener:', error);
        }
    });
}

/**
 * Cleanup function for module teardown
 */
export function cleanup() {
    stopRealtimeSync();
    posListeners.length = 0;
}
