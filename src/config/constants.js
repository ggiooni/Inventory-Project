/**
 * @file constants.js
 * @description Application constants and configuration values
 * @author Nicolas Boggioni Troncoso
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 * @version 1.0.0
 * @date 2025
 *
 * This file centralizes all magic numbers and configuration values
 * following software engineering best practices for maintainability.
 */

// =============================================
// USER ROLES AND PERMISSIONS
// =============================================

/**
 * User role definitions mapped to email addresses
 * In a production environment, these would be stored in the database
 * @constant {Object}
 */
export const USER_ROLES = Object.freeze({
    'admin@inventory.com': 'admin',
    'manager@inventory.com': 'manager',
    'staff@inventory.com': 'staff',
    // Legacy support for original domain
    'admin@wishbone.com': 'admin',
    'manager@wishbone.com': 'manager',
    'staff@wishbone.com': 'staff'
});

/**
 * Role hierarchy levels for permission checking
 * Higher number = more permissions
 * @constant {Object}
 */
export const ROLE_LEVELS = Object.freeze({
    staff: 1,
    manager: 2,
    admin: 3
});

// =============================================
// INVENTORY CONFIGURATION
// =============================================

/**
 * Default priority settings per product category
 * These define the alert thresholds and urgency levels
 * @constant {Object}
 */
export const DEFAULT_PRIORITIES = Object.freeze({
    'Spirits': { priority: 'high', threshold: 2 },
    'Wines': { priority: 'medium', threshold: 3 },
    'Beers': { priority: 'medium', threshold: 6 },
    'Soft Drinks': { priority: 'low', threshold: 12 },
    'Syrups': { priority: 'medium', threshold: 2 }
});

/**
 * Product categories available in the system
 * @constant {Array<string>}
 */
export const PRODUCT_CATEGORIES = Object.freeze([
    'Spirits',
    'Wines',
    'Beers',
    'Soft Drinks',
    'Syrups'
]);

/**
 * Priority levels for stock alerts
 * @constant {Array<string>}
 */
export const PRIORITY_LEVELS = Object.freeze(['high', 'medium', 'low']);

/**
 * Stock status types for visual indicators
 * @constant {Object}
 */
export const STOCK_STATUS = Object.freeze({
    URGENT: 'urgent',
    NORMAL: 'normal',
    INFO: 'info',
    GOOD: 'good',
    OPTIMAL: 'optimal'
});

/**
 * Status priority order for sorting (higher = more urgent)
 * @constant {Object}
 */
export const STATUS_ORDER = Object.freeze({
    urgent: 4,
    normal: 3,
    info: 2,
    good: 1,
    optimal: 0
});

// =============================================
// UI CONFIGURATION
// =============================================

/**
 * Toast notification auto-dismiss time in milliseconds
 * @constant {number}
 */
export const TOAST_DURATION = 4000;

/**
 * Animation duration for UI transitions in milliseconds
 * @constant {number}
 */
export const ANIMATION_DURATION = 300;

/**
 * Maximum number of alerts to display in the dashboard grid
 * @constant {number}
 */
export const MAX_VISIBLE_ALERTS = 6;

/**
 * Debounce delay for search input in milliseconds
 * @constant {number}
 */
export const SEARCH_DEBOUNCE_DELAY = 300;

// =============================================
// POS INTEGRATION CONFIGURATION
// =============================================

/**
 * Supported POS systems for integration
 * @constant {Object}
 */
export const POS_SYSTEMS = Object.freeze({
    TOAST: 'toast',
    SQUARE: 'square',
    CLOVER: 'clover',
    LIGHTSPEED: 'lightspeed'
});

/**
 * Sync frequency options in minutes
 * @constant {Object}
 */
export const SYNC_FREQUENCIES = Object.freeze({
    REALTIME: 'realtime',
    FIVE_MIN: '5min',
    FIFTEEN_MIN: '15min',
    THIRTY_MIN: '30min',
    ONE_HOUR: '1hour'
});

// =============================================
// AI ASSISTANT CONFIGURATION
// =============================================

/**
 * Maximum conversation history length to maintain context
 * @constant {number}
 */
export const MAX_CONVERSATION_HISTORY = 10;

/**
 * AI model configuration
 * @constant {Object}
 */
export const AI_CONFIG = Object.freeze({
    MODEL: 'llama-3.3-70b-versatile',
    TEMPERATURE: 0.7,
    MAX_TOKENS: 1024
});

// =============================================
// ERROR MESSAGES
// =============================================

/**
 * Standardized error messages for user display
 * @constant {Object}
 */
export const ERROR_MESSAGES = Object.freeze({
    AUTH: {
        USER_NOT_FOUND: 'Invalid email or password.',
        WRONG_PASSWORD: 'Invalid email or password.',
        INVALID_EMAIL: 'Invalid email format.',
        TOO_MANY_REQUESTS: 'Too many failed attempts. Try again later.',
        GENERIC: 'Login failed. Please try again.'
    },
    PERMISSION: {
        DENIED: 'Permission denied',
        ADMIN_REQUIRED: 'Admin access required',
        MANAGER_REQUIRED: 'Manager or Admin access required'
    },
    INVENTORY: {
        NEGATIVE_STOCK: 'Cannot have negative stock!',
        UPDATE_ERROR: 'Error updating stock',
        LOAD_ERROR: 'Error loading data'
    },
    AI: {
        NOT_AVAILABLE: 'AI service is not available. Please ensure Cloud Functions are deployed.',
        GENERIC: 'AI service error. Please try again.'
    }
});

/**
 * Success messages for user feedback
 * @constant {Object}
 */
export const SUCCESS_MESSAGES = Object.freeze({
    LOGIN: (userName) => `Welcome back, ${userName}!`,
    LOGOUT: 'Signed out successfully',
    STOCK_UPDATE: (action, quantity, name, oldStock, newStock) =>
        `${action === 'add' ? 'Added' : 'Removed'} ${quantity} ${name}. Stock: ${oldStock} → ${newStock}`,
    PRIORITY_UPDATE: 'Priority settings updated',
    POS_CONFIG_SAVED: 'POS configuration saved successfully!',
    SYNC_COMPLETE: 'Sync completed successfully!'
});
