/**
 * @file constants.js
 * @description Application constants and configuration
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

// User roles
const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff'
};

// Default priority settings per category
const DEFAULT_PRIORITIES = {
    'Spirits': { priority: 'high', threshold: 2 },
    'Wines': { priority: 'medium', threshold: 3 },
    'Beers': { priority: 'medium', threshold: 6 },
    'Soft Drinks': { priority: 'low', threshold: 12 },
    'Syrups': { priority: 'medium', threshold: 2 }
};

// Product categories
const CATEGORIES = ['Spirits', 'Wines', 'Beers', 'Soft Drinks', 'Syrups'];

// Priority levels
const PRIORITY_LEVELS = ['high', 'medium', 'low'];

// Stock status types
const STOCK_STATUS = {
    URGENT: 'urgent',
    NORMAL: 'normal',
    INFO: 'info',
    GOOD: 'good',
    OPTIMAL: 'optimal'
};

// POS Systems supported
const POS_SYSTEMS = ['toast', 'square', 'clover', 'lightspeed'];

// JWT Configuration
const JWT_CONFIG = {
    EXPIRES_IN: '24h',
    ALGORITHM: 'HS256'
};

// API Response messages
const MESSAGES = {
    SUCCESS: {
        LOGIN: 'Login successful',
        LOGOUT: 'Logout successful',
        CREATED: 'Resource created successfully',
        UPDATED: 'Resource updated successfully',
        DELETED: 'Resource deleted successfully'
    },
    ERROR: {
        UNAUTHORIZED: 'Unauthorized access',
        FORBIDDEN: 'Access forbidden',
        NOT_FOUND: 'Resource not found',
        VALIDATION: 'Validation error',
        SERVER: 'Internal server error'
    }
};

module.exports = {
    USER_ROLES,
    DEFAULT_PRIORITIES,
    CATEGORIES,
    PRIORITY_LEVELS,
    STOCK_STATUS,
    POS_SYSTEMS,
    JWT_CONFIG,
    MESSAGES
};
